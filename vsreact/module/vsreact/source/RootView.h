#pragma once

#include "JsRuntime.h"
#include "Scheduler.h"
#include "FontRegistry.h"
#include "ShadowTree.h"
#include "Painter.h"
#include "NativeRegistry.h"
#include "ErrorOverlay.h"

#include <map>

namespace vsreact
{

struct RootOptions
{
    /** Bundle on disk (dev builds — supports watching). */
    juce::File bundleFile;

    /** Embedded bundle source (production builds). Used when bundleFile is
        empty or missing. */
    juce::String bundleSource;

    /** Re-evaluate the bundle when bundleFile changes on disk. */
    bool watchForChanges = false;

    /** Handler for native.call(name, args) from JS. Returns the JSON-encoded
        result value. */
    std::function<juce::var (const juce::String& name, const juce::var& args)> onNativeCall;
};

/** The component hosting a VSReacT app: owns the JS runtime, shadow tree,
    scheduler, hosted native children, and paints the whole UI. */
class RootView : public juce::Component,
                 private juce::Timer
{
public:
    RootView (RootOptions options, NativeRegistry registry = {});
    ~RootView() override;

    /** Pushes an event to JS listeners registered with native.on(name, cb). */
    void sendNativeEvent (const juce::String& name, const juce::var& payload);

    void paint (juce::Graphics& g) override;
    void resized() override;

    bool isBundleLoaded() const noexcept { return bundleLoaded; }

    // Mouse handling (hit-testing into the shadow tree).
    void mouseMove (const juce::MouseEvent& e) override;
    void mouseEnter (const juce::MouseEvent& e) override;
    void mouseExit (const juce::MouseEvent& e) override;
    void mouseDown (const juce::MouseEvent& e) override;
    void mouseDrag (const juce::MouseEvent& e) override;
    void mouseUp (const juce::MouseEvent& e) override;
    void mouseDoubleClick (const juce::MouseEvent& e) override;
    void mouseWheelMove (const juce::MouseEvent& e, const juce::MouseWheelDetails& wheel) override;

    // Keyboard: Tab / Shift-Tab cycle focusable nodes; other keys go to the
    // focused node's onKeyDown as web-style names ("ArrowUp", "Enter", "a").
    bool keyPressed (const juce::KeyPress& key) override;

    // Releases of keys seen by keyPressed dispatch "keyup" to the focused node.
    bool keyStateChanged (bool isKeyDown) override;

    /** Web KeyboardEvent.key name for a JUCE key press ("ArrowUp", "Enter",
        "Escape", " ", "a"). Exposed for tests. */
    static juce::String keyName (const juce::KeyPress& key);

private:
    void focusNode (int nodeId);
    void clearSelection();
    void sendResizeEvent();
    void initialiseRuntime();
    void teardownRuntime();
    void handleFlush (const juce::String& opsJson);
    void showError (const juce::String& message, const juce::String& stack);
    void relayout();
    void dispatchLayoutEvents();
    void syncHostedComponents();
    void hostComponentFor (Node& node);
    void dispatchNodeEvent (int nodeId, const juce::String& type, const juce::var& payload = {});
    void updateHoverState (juce::Point<float> position);
    void timerCallback() override;

    RootOptions options;
    NativeRegistry registry;

    ShadowTree tree;
    Scheduler scheduler;
    ErrorOverlay errorOverlay;
    FontRegistry fontRegistry;   // typefaces registered from JS (registerFont)

    std::map<int, std::unique_ptr<juce::Component>> hostedComponents;

    int hoveredNodeId = 0, activeNodeId = 0;
    int focusedNodeId = 0;
    juce::Array<juce::KeyPress> pressedKeys;
    int dragNodeId = 0;
    juce::Point<float> dragStartPosition;
    bool dragging = false;

    // Active text selection (one at a time, userSelect:"text" nodes).
    int selectionNodeId = 0;
    int selectionAnchor = 0;
    bool selectingText = false;
    bool bundleLoaded = false;
    juce::Time bundleModificationTime;

    // Declared last: destroyed first, while everything it references lives.
    std::unique_ptr<JsRuntime> runtime;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (RootView)
};

} // namespace vsreact
