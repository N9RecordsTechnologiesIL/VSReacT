#include "RootView.h"
#include "HitTest.h"
#include "TextInputHost.h"

namespace vsreact
{

RootView::RootView (RootOptions optionsIn, NativeRegistry registryIn)
    : options (std::move (optionsIn)),
      registry (std::move (registryIn))
{
    setOpaque (false);

    tree.onNodePropsChanged = [this] (Node& node) { hostComponentFor (node); };

    tree.onNodeRemoved = [this] (Node& node)
    {
        hostedComponents.erase (node.id);

        if (hoveredNodeId == node.id) hoveredNodeId = 0;
        if (activeNodeId == node.id)  activeNodeId = 0;
    };

    scheduler.onFire = [this] (int id)
    {
        if (runtime == nullptr)
            return;

        auto* payload = new juce::DynamicObject();
        payload->setProperty ("kind", "timer");
        payload->setProperty ("id", id);
        runtime->dispatch (juce::var (payload));
    };

    addChildComponent (errorOverlay);

    initialiseRuntime();

    if (options.watchForChanges && options.bundleFile != juce::File())
        startTimer (250);
}

RootView::~RootView()
{
    stopTimer();
}

//==============================================================================
void RootView::initialiseRuntime()
{
    errorOverlay.setVisible (false);

    juce::String source;
    juce::String sourceName = "bundle.js";

    if (options.bundleFile.existsAsFile())
    {
        source = options.bundleFile.loadFileAsString();
        sourceName = options.bundleFile.getFileName();
        bundleModificationTime = options.bundleFile.getLastModificationTime();
    }
    else if (options.bundleSource.isNotEmpty())
    {
        source = options.bundleSource;
    }

    if (source.isEmpty())
    {
        showError ("No JS bundle found",
                   "Expected a bundle at:\n" + options.bundleFile.getFullPathName()
                       + "\n\nBuild it with: bun run build");
        return;
    }

    JsRuntime::Callbacks callbacks;

    callbacks.onFlush = [this] (const juce::String& opsJson) { handleFlush (opsJson); };

    callbacks.onNativeCall = [this] (const juce::String& name, const juce::var& args) -> juce::var
    {
        return options.onNativeCall != nullptr ? options.onNativeCall (name, args) : juce::var();
    };

    callbacks.onLog = [] (const juce::String& level, const juce::String& message)
    {
        juce::Logger::writeToLog ("[vsreact:" + level + "] " + message);
    };

    callbacks.onSetTimer = [this] (int id, int ms) { scheduler.setTimer (id, ms); };
    callbacks.onClearTimer = [this] (int id) { scheduler.clearTimer (id); };

    callbacks.onError = [this] (const juce::String& message, const juce::String& stack)
    {
        showError (message, stack);
    };

    runtime = std::make_unique<JsRuntime> (std::move (callbacks));
    bundleLoaded = runtime->evaluate (source, sourceName);
    relayout();
}

void RootView::teardownRuntime()
{
    runtime.reset();
    tree.applyOpsJson ("[[\"clearContainer\"]]");
    hostedComponents.clear();
    hoveredNodeId = activeNodeId = 0;
    bundleLoaded = false;
}

void RootView::timerCallback()
{
    if (! options.bundleFile.existsAsFile())
        return;

    const auto modified = options.bundleFile.getLastModificationTime();

    if (modified != bundleModificationTime)
    {
        const auto start = juce::Time::getMillisecondCounterHiRes();

        teardownRuntime();
        initialiseRuntime();

        juce::Logger::writeToLog (
            "[vsreact] hot reload in "
            + juce::String (juce::Time::getMillisecondCounterHiRes() - start, 1) + " ms");
    }
}

//==============================================================================
void RootView::handleFlush (const juce::String& opsJson)
{
    tree.applyOpsJson (opsJson);

    if (tree.find (hoveredNodeId) == nullptr) hoveredNodeId = 0;
    if (tree.find (activeNodeId) == nullptr)  activeNodeId = 0;

    relayout();
}

void RootView::relayout()
{
    if (getWidth() <= 0 || getHeight() <= 0)
        return;

    tree.computeLayout (static_cast<float> (getWidth()), static_cast<float> (getHeight()));
    syncHostedComponents();
    repaint();
}

void RootView::syncHostedComponents()
{
    for (auto& [nodeId, component] : hostedComponents)
        if (const auto* node = tree.find (nodeId))
            component->setBounds (node->frame.toNearestInt());
}

void RootView::hostComponentFor (Node& node)
{
    if (node.type == "native")
    {
        if (hostedComponents.count (node.id) != 0)
            return;

        const auto nativeId = node.props["nativeId"].toString();

        if (auto component = registry.create (nativeId))
        {
            addAndMakeVisible (*component);
            hostedComponents[node.id] = std::move (component);
        }
        else if (nativeId.isNotEmpty())
        {
            juce::Logger::writeToLog ("[vsreact] no native factory registered for \""
                                      + nativeId + "\"");
        }

        return;
    }

    if (node.type == "textinput")
    {
        const auto it = hostedComponents.find (node.id);

        if (it != hostedComponents.end())
        {
            static_cast<TextInputHost*> (it->second.get())->applyNode (node);
            return;
        }

        auto host = std::make_unique<TextInputHost>();
        const auto nodeId = node.id;

        host->onEvent = [this, nodeId] (const juce::String& type, const juce::var& payload)
        {
            auto* current = tree.find (nodeId);

            if (current == nullptr)
                return;

            if (type == "focus" || type == "blur")
            {
                current->focused = type == "focus";
                repaint();
            }

            if (current->listeners.contains (type))
                dispatchNodeEvent (nodeId, type, payload);
        };

        host->applyNode (node);
        addAndMakeVisible (*host);
        hostedComponents[node.id] = std::move (host);
    }
}

void RootView::showError (const juce::String& message, const juce::String& stack)
{
    juce::Logger::writeToLog ("[vsreact] ERROR: " + message + "\n" + stack);
    errorOverlay.show (message, stack);
}

//==============================================================================
void RootView::sendNativeEvent (const juce::String& name, const juce::var& payload)
{
    if (runtime == nullptr)
        return;

    auto* message = new juce::DynamicObject();
    message->setProperty ("kind", "native");
    message->setProperty ("name", name);
    message->setProperty ("payload", payload);
    runtime->dispatch (juce::var (message));
}

void RootView::dispatchNodeEvent (int nodeId, const juce::String& type, const juce::var& payload)
{
    if (runtime == nullptr || nodeId == 0)
        return;

    auto* message = new juce::DynamicObject();
    message->setProperty ("kind", "event");
    message->setProperty ("nodeId", nodeId);
    message->setProperty ("type", type);
    message->setProperty ("payload", payload);
    runtime->dispatch (juce::var (message));
}

//==============================================================================
void RootView::paint (juce::Graphics& g)
{
    Painter::paint (g, *tree.root());
}

void RootView::resized()
{
    errorOverlay.setBounds (getLocalBounds());
    relayout();
}

//==============================================================================
void RootView::updateHoverState (juce::Point<float> position)
{
    auto* hit = vsreact::hitTest (*tree.root(),position);
    const auto newId = hit != nullptr ? hit->id : 0;

    if (newId == hoveredNodeId)
        return;

    if (auto* previous = tree.find (hoveredNodeId); previous != nullptr && hoveredNodeId != 0)
    {
        previous->hovered = false;

        if (previous->listeners.contains ("mouseleave"))
            dispatchNodeEvent (previous->id, "mouseleave");
    }

    hoveredNodeId = newId;

    if (hit != nullptr)
    {
        hit->hovered = true;

        if (hit->listeners.contains ("mouseenter"))
            dispatchNodeEvent (hit->id, "mouseenter");
    }

    // Dispatching may have mutated the tree — re-find before dereferencing.
    auto* hovered = tree.find (hoveredNodeId);
    const auto cursor = (hovered != nullptr && hoveredNodeId != 0)
                          ? hovered->effectiveStyle().getString ("cursor")
                          : juce::String();

    setMouseCursor (cursor == "pointer" ? juce::MouseCursor::PointingHandCursor
                    : cursor == "text"  ? juce::MouseCursor::IBeamCursor
                                        : juce::MouseCursor::NormalCursor);

    repaint();
}

void RootView::mouseMove (const juce::MouseEvent& e)  { updateHoverState (e.position); }
void RootView::mouseEnter (const juce::MouseEvent& e) { updateHoverState (e.position); }

void RootView::mouseExit (const juce::MouseEvent&)
{
    updateHoverState ({ -1.0f, -1.0f });
}

void RootView::mouseDown (const juce::MouseEvent& e)
{
    auto* hit = vsreact::hitTest (*tree.root(),e.position);

    if (hit == nullptr)
        return;

    activeNodeId = hit->id;
    hit->active = true;

    if (hit->listeners.contains ("mousedown"))
        dispatchNodeEvent (hit->id, "mousedown");

    repaint();
}

void RootView::mouseUp (const juce::MouseEvent& e)
{
    const auto pressedId = activeNodeId;

    if (auto* pressed = tree.find (pressedId); pressed != nullptr && pressedId != 0)
    {
        pressed->active = false;

        if (pressed->listeners.contains ("mouseup"))
            dispatchNodeEvent (pressedId, "mouseup");

        auto* hit = vsreact::hitTest (*tree.root(),e.position);

        if (hit != nullptr && hit->id == pressedId && hit->listeners.contains ("click"))
            dispatchNodeEvent (pressedId, "click");
    }

    activeNodeId = 0;
    repaint();
}

} // namespace vsreact
