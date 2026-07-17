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
    dispatchLayoutEvents();
    repaint();
}

void RootView::dispatchLayoutEvents()
{
    // Collect first, dispatch after: a layout handler can setState → flush →
    // tree mutation, which must not happen while we walk the tree.
    struct PendingLayout { int nodeId; juce::var payload; };
    std::vector<PendingLayout> pending;

    std::function<void (Node&)> collect = [&] (Node& node)
    {
        if (node.listeners.contains ("layout"))
        {
            const auto rect = node.frame.translated (0.0f, -node.accumulatedAncestorScroll());

            if (! node.layoutReported || rect != node.reportedLayout)
            {
                node.reportedLayout = rect;
                node.layoutReported = true;

                auto* payload = new juce::DynamicObject();
                payload->setProperty ("x", rect.getX());
                payload->setProperty ("y", rect.getY());
                payload->setProperty ("width", rect.getWidth());
                payload->setProperty ("height", rect.getHeight());
                pending.push_back ({ node.id, juce::var (payload) });
            }
        }

        for (auto* child : node.children)
            collect (*child);
    };

    collect (*tree.root());

    for (auto& event : pending)
        dispatchNodeEvent (event.nodeId, "layout", event.payload);
}

void RootView::syncHostedComponents()
{
    for (auto& [nodeId, component] : hostedComponents)
    {
        if (const auto* node = tree.find (nodeId))
        {
            component->setBounds (node->frame
                                      .translated (0.0f, -node->accumulatedAncestorScroll())
                                      .toNearestInt());

            // Hosted JUCE components always draw above painted content, so
            // opacity-0 is the app's way to hide them under overlays.
            component->setVisible (node->effectiveStyle().opacity() > 0.01f);
        }
    }
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
namespace
{
    /** Nearest node (self or ancestor) listening for the event — DOM-style
        bubbling for hits that land on decorative children. */
    Node* nearestListener (Node* from, const juce::String& type)
    {
        for (auto* node = from; node != nullptr; node = node->parent)
            if (node->listeners.contains (type))
                return node;

        return nullptr;
    }

    /** Nearest node (self or ancestor) that reacts to presses. */
    Node* nearestPressTarget (Node* from)
    {
        for (auto* node = from; node != nullptr; node = node->parent)
            if (node->listeners.contains ("click")
                || node->listeners.contains ("mousedown")
                || ! node->activeStyle.isEmpty())
                return node;

        return nullptr;
    }
}

void RootView::updateHoverState (juce::Point<float> position)
{
    auto* hit = vsreact::hitTest (*tree.root(), position);
    const auto newId = hit != nullptr ? hit->id : 0;

    if (newId == hoveredNodeId)
        return;

    // CSS-style :hover — the whole ancestor chain under the pointer is hovered.
    std::vector<int> oldChain, newChain;

    for (auto* node = tree.find (hoveredNodeId); node != nullptr && node->id != 0; node = node->parent)
        oldChain.push_back (node->id);

    for (auto* node = hit; node != nullptr && node->id != 0; node = node->parent)
        newChain.push_back (node->id);

    const auto inChain = [] (const std::vector<int>& chain, int id)
    { return std::find (chain.begin(), chain.end(), id) != chain.end(); };

    for (const auto id : oldChain)
        if (! inChain (newChain, id))
            if (auto* node = tree.find (id))
                node->hovered = false;

    for (const auto id : newChain)
        if (! inChain (oldChain, id))
            if (auto* node = tree.find (id))
                node->hovered = true;

    // enter/leave bubble to the nearest listener that changed chains.
    auto* oldListener = nearestListener (tree.find (hoveredNodeId), "mouseleave");
    hoveredNodeId = newId;
    auto* newListener = nearestListener (hit, "mouseenter");

    if (oldListener != nullptr && ! inChain (newChain, oldListener->id))
        dispatchNodeEvent (oldListener->id, "mouseleave");

    if (newListener != nullptr && ! inChain (oldChain, newListener->id))
        dispatchNodeEvent (newListener->id, "mouseenter");

    // Dispatching may have mutated the tree — re-find before dereferencing.
    juce::String cursor;

    for (auto* node = tree.find (hoveredNodeId); node != nullptr && node->id != 0; node = node->parent)
    {
        cursor = node->effectiveStyle().getString ("cursor");

        if (cursor.isNotEmpty())
            break;
    }

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

namespace
{
    juce::var dragPayload (juce::Point<float> position, juce::Point<float> start)
    {
        auto* payload = new juce::DynamicObject();
        payload->setProperty ("dx", position.x - start.x);
        payload->setProperty ("dy", position.y - start.y);
        payload->setProperty ("x", position.x);
        payload->setProperty ("y", position.y);
        return juce::var (payload);
    }

    bool listensForDrag (const Node& node)
    {
        return node.listeners.contains ("drag")
            || node.listeners.contains ("dragstart")
            || node.listeners.contains ("dragend");
    }
}

void RootView::mouseDown (const juce::MouseEvent& e)
{
    auto* hit = vsreact::hitTest (*tree.root(), e.position);

    dragNodeId = 0;
    dragging = false;
    dragStartPosition = e.position;

    for (auto* node = hit; node != nullptr; node = node->parent)
    {
        if (listensForDrag (*node))
        {
            dragNodeId = node->id;
            break;
        }
    }

    auto* target = nearestPressTarget (hit);

    if (target == nullptr)
        return;

    activeNodeId = target->id;
    target->active = true;

    if (target->listeners.contains ("mousedown"))
        dispatchNodeEvent (target->id, "mousedown");

    repaint();
}

void RootView::mouseDrag (const juce::MouseEvent& e)
{
    auto* node = tree.find (dragNodeId);

    if (node == nullptr || dragNodeId == 0)
        return;

    if (! dragging)
    {
        if (e.position.getDistanceFrom (dragStartPosition) < 3.0f)
            return;

        dragging = true;

        if (node->listeners.contains ("dragstart"))
            dispatchNodeEvent (dragNodeId, "dragstart", dragPayload (e.position, dragStartPosition));
    }

    if (auto* current = tree.find (dragNodeId); current != nullptr && current->listeners.contains ("drag"))
        dispatchNodeEvent (dragNodeId, "drag", dragPayload (e.position, dragStartPosition));
}

void RootView::mouseUp (const juce::MouseEvent& e)
{
    const auto pressedId = activeNodeId;
    const bool wasDragging = dragging;

    if (wasDragging)
    {
        if (auto* node = tree.find (dragNodeId); node != nullptr && dragNodeId != 0
            && node->listeners.contains ("dragend"))
            dispatchNodeEvent (dragNodeId, "dragend", dragPayload (e.position, dragStartPosition));
    }

    dragNodeId = 0;
    dragging = false;

    if (auto* pressed = tree.find (pressedId); pressed != nullptr && pressedId != 0)
    {
        pressed->active = false;

        if (pressed->listeners.contains ("mouseup"))
            dispatchNodeEvent (pressedId, "mouseup");

        auto* released = nearestPressTarget (vsreact::hitTest (*tree.root(), e.position));

        // A completed drag is not a click.
        if (! wasDragging && released != nullptr && released->id == pressedId
            && released->listeners.contains ("click"))
            dispatchNodeEvent (pressedId, "click");
    }

    activeNodeId = 0;
    repaint();
}

void RootView::mouseDoubleClick (const juce::MouseEvent& e)
{
    auto* hit = vsreact::hitTest (*tree.root(), e.position);

    if (auto* listener = nearestListener (hit, "dblclick"))
        dispatchNodeEvent (listener->id, "dblclick");
}

void RootView::mouseWheelMove (const juce::MouseEvent& e, const juce::MouseWheelDetails& wheel)
{
    // Controls get first refusal on the wheel (knob nudging); scroll
    // containers keep it otherwise.
    auto* hit = vsreact::hitTest (*tree.root(), e.position);

    if (auto* listener = nearestListener (hit, "wheel"))
    {
        auto* payload = new juce::DynamicObject();
        payload->setProperty ("dy", wheel.deltaY);
        dispatchNodeEvent (listener->id, "wheel", juce::var (payload));
        return;
    }

    auto* scrollable = hitTestScrollable (*tree.root(), e.position);

    if (scrollable == nullptr)
        return;

    const auto extent = scrollable->maxScroll();

    if (extent <= 0.0f)
        return;

    scrollable->scrollY = juce::jlimit (0.0f, extent,
                                        scrollable->scrollY - wheel.deltaY * 400.0f);

    syncHostedComponents();
    updateHoverState (e.position);
    repaint();
}

} // namespace vsreact
