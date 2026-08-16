#include "RootView.h"
#include "HitTest.h"
#include "TextInputHost.h"
#include "TextSelection.h"

namespace vsreact
{

RootView::RootView (RootOptions optionsIn, NativeRegistry registryIn)
    : options (std::move (optionsIn)),
      registry (std::move (registryIn))
{
    setOpaque (false);

    tree.onNodePropsChanged = [this] (Node& node) { hostComponentFor (node); };

    setWantsKeyboardFocus (true);

    tree.onNodeRemoved = [this] (Node& node)
    {
        hostedComponents.erase (node.id);

        if (hoveredNodeId == node.id) hoveredNodeId = 0;
        if (activeNodeId == node.id)  activeNodeId = 0;
        if (focusedNodeId == node.id) focusedNodeId = 0;

        if (selectionNodeId == node.id)
        {
            selectionNodeId = 0;
            selectingText = false;
        }
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
        // JS-driven editor resize (useEditorSize). Already on the message
        // thread; setSize triggers resized(), which sends "resize" back so
        // useRootSize observes the size the host actually granted.
        if (name == "vsreact:resize")
        {
            const int w = (int) args.getProperty ("width", getWidth());
            const int h = (int) args.getProperty ("height", getHeight());
            setSize (juce::jmax (1, w), juce::jmax (1, h));
            return juce::var();
        }

        return options.onNativeCall != nullptr ? options.onNativeCall (name, args) : juce::var();
    };

    callbacks.onLog = [] (const juce::String& level, const juce::String& message)
    {
        juce::Logger::writeToLog ("[vsreact:" + level + "] " + message);
    };

    callbacks.onRegisterFont = [this] (const juce::String& family, const juce::String& src, int weight)
    {
        if (! tree.resources().fonts.registerFont (family, src, weight))
            juce::Logger::writeToLog ("[vsreact] registerFont failed for \"" + family + "\"");
    };

    callbacks.onRegisterImage = [this] (const juce::String& src) -> juce::String
    {
        auto handle = tree.resources().images.registerImage (src);

        if (handle.isEmpty())
            juce::Logger::writeToLog ("[vsreact] registerImage failed (undecodable src)");

        return handle;
    };

    callbacks.onCanvasBuffer = [this] (int nodeId, int w, int h) -> JsRuntime::CanvasBuffer
    {
        auto* node = tree.find (nodeId);

        if (node == nullptr)
            return {};

        if (node->canvas == nullptr)
            node->canvas = std::make_shared<CanvasSurface>();

        auto* data = node->canvas->ensure (w, h);
        return { data, node->canvas->byteSize() };
    };

    callbacks.onCanvasCommit = [this] (int nodeId)
    {
        auto* node = tree.find (nodeId);

        if (node != nullptr && node->canvas != nullptr)
        {
            node->canvas->commit();
            repaint();
        }
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
    sendResizeEvent(); // seed useRootSize with the mount-time size
}

void RootView::sendResizeEvent()
{
    auto* payload = new juce::DynamicObject();
    payload->setProperty ("width", getWidth());
    payload->setProperty ("height", getHeight());
    sendNativeEvent ("resize", juce::var (payload));
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
            const auto scroll = node.accumulatedAncestorScroll();
            const auto rect = node.frame.translated (-scroll.x, -scroll.y);

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
            const auto scroll = node->accumulatedAncestorScroll();
            component->setBounds (node->frame
                                      .translated (-scroll.x, -scroll.y)
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

                // Keep the focus cycle in sync: a focused editor is the
                // focused node, so the next Tab continues from it.
                if (type == "focus" && focusedNodeId != nodeId)
                {
                    if (auto* old = tree.find (focusedNodeId); old != nullptr && focusedNodeId != 0)
                    {
                        old->focused = false;

                        if (old->listeners.contains ("blur"))
                            dispatchNodeEvent (old->id, "blur");
                    }

                    focusedNodeId = nodeId;
                }
                else if (type == "blur" && focusedNodeId == nodeId)
                {
                    focusedNodeId = 0;
                }

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
    // backdrop-filter needs to read back what's painted beneath a node, so
    // trees that use it render into a frame buffer and blit. Everyone else
    // keeps the direct path.
    if (getWidth() > 0 && getHeight() > 0 && Painter::treeHasBackdrop (*tree.root()))
    {
        // Software image type: backdrop sampling reads the buffer while its
        // Graphics is still alive — native (DIB/CoreGraphics) images don't
        // reliably expose in-flight writes to BitmapData readers.
        juce::Image buffer (juce::Image::ARGB, getWidth(), getHeight(), true,
                            juce::SoftwareImageType());

        {
            juce::Graphics bufferGraphics (buffer);
            Painter::paint (bufferGraphics, *tree.root(), buffer);
        }

        g.drawImageAt (buffer, 0, 0);
        return;
    }

    Painter::paint (g, *tree.root());
}

void RootView::resized()
{
    errorOverlay.setBounds (getLocalBounds());
    relayout();

    if (runtime != nullptr)
        sendResizeEvent();
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

    // Selectable text reads as text: I-beam unless something explicit won.
    if (cursor.isEmpty())
        for (auto* node = tree.find (hoveredNodeId); node != nullptr && node->id != 0; node = node->parent)
            if (node->isSelectableText())
            {
                cursor = "text";
                break;
            }

    setMouseCursor (cursor == "pointer"     ? juce::MouseCursor::PointingHandCursor
                    : cursor == "text"      ? juce::MouseCursor::IBeamCursor
                    : cursor == "grab"      ? juce::MouseCursor::DraggingHandCursor
                    : cursor == "grabbing"  ? juce::MouseCursor::DraggingHandCursor
                    : cursor == "move"      ? juce::MouseCursor::UpDownLeftRightResizeCursor
                    : cursor == "ns-resize" ? juce::MouseCursor::UpDownResizeCursor
                    : cursor == "ew-resize" ? juce::MouseCursor::LeftRightResizeCursor
                    : cursor == "crosshair" ? juce::MouseCursor::CrosshairCursor
                    : cursor == "not-allowed" ? juce::MouseCursor::NoCursor
                                            : juce::MouseCursor::NormalCursor);

    repaint();
}

void RootView::mouseMove (const juce::MouseEvent& e)
{
    updateHoverState (e.position);

    if (auto* hit = vsreact::hitTest (*tree.root(), e.position))
    {
        for (auto* node = hit; node != nullptr; node = node->parent)
        {
            if (node->listeners.contains ("mousemove"))
            {
                auto* payload = new juce::DynamicObject();
                payload->setProperty ("x", e.position.x);
                payload->setProperty ("y", e.position.y);
                dispatchNodeEvent (node->id, "mousemove", juce::var (payload));
                break;
            }
        }
    }
}

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

    // Text selection: any press clears the old one; selectable text anchors
    // a new one unless a control claimed the drag gesture (controls win).
    clearSelection();

    if (dragNodeId == 0)
    {
        for (auto* node = hit; node != nullptr; node = node->parent)
        {
            if (node->isSelectableText())
            {
                const auto scroll = node->accumulatedAncestorScroll();
                selectionNodeId = node->id;
                selectionAnchor = TextSelection::caretIndexAt (*node, e.position + scroll);
                node->selStart = node->selEnd = selectionAnchor;
                selectingText = true;
                break;
            }
        }
    }

    // Click-to-focus: nearest focusable ancestor, or blur on empty space.
    auto* focusable = vsreact::nearestFocusable (hit);
    focusNode (focusable != nullptr ? focusable->id : 0);

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
    if (selectingText)
    {
        if (auto* selected = tree.find (selectionNodeId); selected != nullptr && selectionNodeId != 0)
        {
            const auto scroll = selected->accumulatedAncestorScroll();
            const auto caret = TextSelection::caretIndexAt (*selected, e.position + scroll);
            selected->selStart = juce::jmin (selectionAnchor, caret);
            selected->selEnd = juce::jmax (selectionAnchor, caret);
            repaint();
        }

        return; // a selection drag is not a control drag
    }

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
    selectingText = false; // the selection itself stays until the next press

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

    // Double-click selects the word under the pointer on selectable text.
    for (auto* node = hit; node != nullptr; node = node->parent)
    {
        if (node->isSelectableText())
        {
            const auto scroll = node->accumulatedAncestorScroll();
            const auto text = TextSelection::visibleText (*node);
            const auto caret = juce::jlimit (0, juce::jmax (0, text.length() - 1),
                                             TextSelection::caretIndexAt (*node, e.position + scroll));
            const auto range = TextSelection::wordRangeAt (text, caret);

            clearSelection();
            selectionNodeId = node->id;
            node->selStart = range.getStart();
            node->selEnd = range.getEnd();
            repaint();
            break;
        }
    }

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
        payload->setProperty ("dx", wheel.deltaX);
        dispatchNodeEvent (listener->id, "wheel", juce::var (payload));
        return;
    }

    auto* scrollable = hitTestScrollable (*tree.root(), e.position);

    if (scrollable == nullptr)
        return;

    // Trackpads report a real deltaX; mice map Shift+wheel to horizontal
    // (the web convention).
    auto deltaX = wheel.deltaX;
    auto deltaY = wheel.deltaY;

    if (deltaX == 0.0f && e.mods.isShiftDown())
        std::swap (deltaX, deltaY);

    const auto extentY = scrollable->maxScroll();
    const auto extentX = scrollable->maxScrollX();

    if (extentY <= 0.0f && extentX <= 0.0f)
        return;

    if (extentY > 0.0f)
        scrollable->scrollY = juce::jlimit (0.0f, extentY,
                                            scrollable->scrollY - deltaY * 400.0f);

    if (extentX > 0.0f)
        scrollable->scrollX = juce::jlimit (0.0f, extentX,
                                            scrollable->scrollX - deltaX * 400.0f);

    syncHostedComponents();
    updateHoverState (e.position);
    repaint();
}

//==============================================================================
void RootView::clearSelection()
{
    selectingText = false;

    if (selectionNodeId == 0)
        return;

    if (auto* node = tree.find (selectionNodeId))
    {
        node->selStart = node->selEnd = 0;
        repaint();
    }

    selectionNodeId = 0;
}

void RootView::focusNode (int nodeId)
{
    if (focusedNodeId == nodeId)
        return;

    if (auto* old = tree.find (focusedNodeId); old != nullptr && focusedNodeId != 0)
    {
        old->focused = false;

        if (old->listeners.contains ("blur"))
            dispatchNodeEvent (old->id, "blur");
    }

    focusedNodeId = nodeId;

    if (auto* next = tree.find (nodeId); next != nullptr && nodeId != 0)
    {
        next->focused = true;

        if (next->listeners.contains ("focus"))
            dispatchNodeEvent (next->id, "focus");

        // Text inputs take real JUCE keyboard focus in their hosted editor;
        // everything else keys through the RootView.
        if (next->type == "textinput")
        {
            if (const auto host = hostedComponents.find (nodeId); host != hostedComponents.end())
                host->second->grabKeyboardFocus();
        }
        else
        {
            grabKeyboardFocus();
        }
    }

    repaint();
}

juce::String RootView::keyName (const juce::KeyPress& key)
{
    const auto code = key.getKeyCode();

    if (code == juce::KeyPress::upKey)        return "ArrowUp";
    if (code == juce::KeyPress::downKey)      return "ArrowDown";
    if (code == juce::KeyPress::leftKey)      return "ArrowLeft";
    if (code == juce::KeyPress::rightKey)     return "ArrowRight";
    if (code == juce::KeyPress::returnKey)    return "Enter";
    if (code == juce::KeyPress::escapeKey)    return "Escape";
    if (code == juce::KeyPress::backspaceKey) return "Backspace";
    if (code == juce::KeyPress::deleteKey)    return "Delete";
    if (code == juce::KeyPress::tabKey)       return "Tab";
    if (code == juce::KeyPress::homeKey)      return "Home";
    if (code == juce::KeyPress::endKey)       return "End";
    if (code == juce::KeyPress::pageUpKey)    return "PageUp";
    if (code == juce::KeyPress::pageDownKey)  return "PageDown";
    if (code == juce::KeyPress::spaceKey)     return " ";

    const auto character = key.getTextCharacter();
    return character != 0 ? juce::String::charToString (character) : juce::String();
}

bool RootView::keyPressed (const juce::KeyPress& key)
{
    // Ctrl/Cmd+C copies the active text selection (the visible, painted text).
    if (key == juce::KeyPress ('c', juce::ModifierKeys::commandModifier, 0))
    {
        if (auto* node = tree.find (selectionNodeId); node != nullptr && selectionNodeId != 0
            && node->selEnd > node->selStart)
        {
            const auto text = TextSelection::visibleText (*node);
            juce::SystemClipboard::copyTextToClipboard (
                text.substring (node->selStart, node->selEnd));
            return true;
        }
    }

    // Escape drops the selection but still reaches the focused node.
    if (key.getKeyCode() == juce::KeyPress::escapeKey)
        clearSelection();

    if (key.getKeyCode() == juce::KeyPress::tabKey)
    {
        if (auto* next = vsreact::nextFocusable (*tree.root(), focusedNodeId,
                                                 key.getModifiers().isShiftDown()))
        {
            focusNode (next->id);
            return true;
        }

        return false;
    }

    if (auto* node = tree.find (focusedNodeId); node != nullptr && focusedNodeId != 0
        && (node->listeners.contains ("keydown") || node->listeners.contains ("keyup")))
    {
        const auto name = keyName (key);

        if (name.isEmpty())
            return false;

        pressedKeys.addIfNotAlreadyThere (key);

        if (! node->listeners.contains ("keydown"))
            return true; // tracked for keyup only

        auto* payload = new juce::DynamicObject();
        payload->setProperty ("key", name);
        payload->setProperty ("shift", key.getModifiers().isShiftDown());
        payload->setProperty ("ctrl", key.getModifiers().isCtrlDown());
        payload->setProperty ("alt", key.getModifiers().isAltDown());
        payload->setProperty ("meta", key.getModifiers().isCommandDown());
        dispatchNodeEvent (focusedNodeId, "keydown", juce::var (payload));
        return true;
    }

    return false;
}

bool RootView::keyStateChanged (bool isKeyDown)
{
    if (isKeyDown)
        return false;

    bool handled = false;

    for (int i = pressedKeys.size(); --i >= 0;)
    {
        const auto key = pressedKeys.getReference (i);

        if (key.isCurrentlyDown())
            continue;

        pressedKeys.remove (i);

        if (auto* node = tree.find (focusedNodeId); node != nullptr && focusedNodeId != 0
            && node->listeners.contains ("keyup"))
        {
            auto* payload = new juce::DynamicObject();
            payload->setProperty ("key", keyName (key));
            payload->setProperty ("shift", key.getModifiers().isShiftDown());
            payload->setProperty ("ctrl", key.getModifiers().isCtrlDown());
            payload->setProperty ("alt", key.getModifiers().isAltDown());
            payload->setProperty ("meta", key.getModifiers().isCommandDown());
            dispatchNodeEvent (focusedNodeId, "keyup", juce::var (payload));
            handled = true;
        }
    }

    return handled;
}

} // namespace vsreact
