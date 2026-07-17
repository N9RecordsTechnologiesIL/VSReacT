#pragma once

#include "Style.h"

#include <functional>
#include <memory>
#include <unordered_map>
#include <vector>

namespace vsreact
{

struct Node
{
    int id = 0;
    juce::String type;   // root | view | text | rawtext | image | textinput | native
    Style style, hoverStyle, activeStyle, focusStyle;
    juce::String text;   // rawtext content
    juce::StringArray listeners;
    juce::var props;     // full setProps payload (cursor, nativeId, value, ...)

    YGNodeRef yoga = nullptr;   // null for rawtext (text nodes measure themselves)
    Node* parent = nullptr;
    std::vector<Node*> children;

    bool hovered = false, active = false, focused = false;
    juce::Rectangle<float> frame;   // absolute (unscrolled) within the root, set by computeLayout
    float scrollY = 0.0f;           // scroll offset for overflow:"scroll" nodes

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

    /** How far this node can scroll (content beyond its frame). */
    float maxScroll() const { return juce::jmax (0.0f, contentHeight() - frame.getHeight()); }

    /** Sum of every ancestor's scrollY — the visual offset applied to this
        node's absolute frame by scrolled containers above it. */
    float accumulatedAncestorScroll() const;
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

    std::function<void (Node&)> onNodeCreated;
    std::function<void (Node&)> onNodePropsChanged;
    std::function<void (Node&)> onNodeRemoved;

    bool layoutDirty = false;

private:
    void applyOp (const juce::var& op);
    void createNode (int id, const juce::String& type);
    void setProps (int id, const juce::var& props);
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

    JUCE_DECLARE_NON_COPYABLE (ShadowTree)
};

} // namespace vsreact
