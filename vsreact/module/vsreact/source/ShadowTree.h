#pragma once

#include "Style.h"
#include "RenderResources.h"

#include <functional>
#include <memory>
#include <unordered_map>
#include <vector>

namespace vsreact
{

struct CanvasSurface;

struct Node
{
    int id = 0;
    juce::String type;   // root | view | text | rawtext | image | textinput | native | svg | svgpath | canvas
    Style style, hoverStyle, activeStyle, focusStyle;
    juce::String text;   // rawtext content
    juce::StringArray listeners;
    juce::var props;     // full setProps payload (cursor, nativeId, value, ...)

    // Pixel store for type == "canvas" (null otherwise). Created lazily when
    // JS first asks for the node's buffer.
    std::shared_ptr<CanvasSurface> canvas;

    YGNodeRef yoga = nullptr;   // null for rawtext (text nodes measure themselves)
    Node* parent = nullptr;
    std::vector<Node*> children;

    /** The owning tree's per-instance registries + paint caches. Stamped by
        ShadowTree at creation; null only for hand-built test nodes, and every
        consumer falls back to uncached/system behaviour then. */
    RenderResources* res = nullptr;

    // paintImage: the decoded bitmap memoised per node, keyed by the src
    // string's character-data address — O(1) per paint. When props are
    // patched (not replaced), an unchanged src keeps the same string data, so
    // this only misses when the src actually changed (then the shared
    // hash-keyed juce::ImageCache still dedupes across nodes).
    mutable juce::Image decodedImage;
    mutable const void* decodedSrcAddress = nullptr;

    bool hovered = false, active = false, focused = false;
    juce::Rectangle<float> frame;   // absolute (unscrolled) within the root, set by computeLayout
    float scrollY = 0.0f;           // scroll offsets for overflow:"scroll" nodes
    float scrollX = 0.0f;

    // Active text selection (userSelect:"text" nodes) — character range into
    // the node's visible textContent(). Owned by RootView, painted by Painter.
    int selStart = 0, selEnd = 0;

    // Last rect delivered to a "layout" listener — layout events fire only
    // when this changes (RootView::dispatchLayoutEvents).
    juce::Rectangle<float> reportedLayout;
    bool layoutReported = false;

    /** style + the state variants that currently apply. */
    Style effectiveStyle() const;

    /** Concatenated rawtext of all children (for text nodes). */
    juce::String textContent() const;

    bool isScrollable() const { return style.getString ("overflow") == "scroll"; }

    /** Height of the content inside this node (children extent + bottom padding). */
    float contentHeight() const;

    /** Width of the content inside this node (children extent + right padding). */
    float contentWidth() const;

    /** How far this node can scroll (content beyond its frame). */
    float maxScroll() const { return juce::jmax (0.0f, contentHeight() - frame.getHeight()); }
    float maxScrollX() const { return juce::jmax (0.0f, contentWidth() - frame.getWidth()); }

    /** Whether this text node opted into selection (userSelect:"text").
        numberOfLines/truncated text stays unselectable — its fitted glyphs
        don't match the selection geometry. */
    bool isSelectableText() const
    {
        return type == "text"
            && style.getString ("userSelect") == "text"
            && style.getFloat ("numberOfLines", 0.0f) <= 0.0f;
    }

    /** Sum of every ancestor's scroll offsets — the visual offset applied to
        this node's absolute frame by scrolled containers above it. */
    juce::Point<float> accumulatedAncestorScroll() const;
};

/** The retained C++ mirror of the React tree. Applies mutation batches from
    the reconciler and computes flexbox layout. Message thread only. */
class ShadowTree
{
public:
    ShadowTree();
    ~ShadowTree();

    void applyOps (const juce::var& opsArray);
    void applyOpsJson (const juce::String& json);

    void computeLayout (float width, float height);

    Node* root() noexcept { return &rootNode; }
    const Node* root() const noexcept { return &rootNode; }
    Node* find (int id);
    int nodeCount() const noexcept { return static_cast<int> (nodes.size()); }

    /** This instance's registries and paint caches (see RenderResources). */
    RenderResources& resources() noexcept { return renderResources; }
    const RenderResources& resources() const noexcept { return renderResources; }

    std::function<void (Node&)> onNodeCreated;
    std::function<void (Node&)> onNodePropsChanged;
    std::function<void (Node&)> onNodeRemoved;

    bool layoutDirty = false;

private:
    void applyOp (const juce::var& op);
    void createNode (int id, const juce::String& type);
    void setProps (int id, const juce::var& props);
    void patchProps (int id, const juce::var& patch);
    void applyDerivedProps (Node& node, const juce::var& incoming);
    void appendChild (int parentId, int childId);
    void insertBefore (int parentId, int childId, int beforeId);
    void removeChild (int parentId, int childId);
    void setText (int id, const juce::String& text);

    void detachFromParent (Node& child);
    void attachChild (Node& parent, Node& child, int index);
    void destroySubtree (Node& node);
    void markTextDirty (Node& node);

    Node rootNode;
    std::unordered_map<int, std::unique_ptr<Node>> nodes;
    RenderResources renderResources;

    JUCE_DECLARE_NON_COPYABLE (ShadowTree)
};

} // namespace vsreact
