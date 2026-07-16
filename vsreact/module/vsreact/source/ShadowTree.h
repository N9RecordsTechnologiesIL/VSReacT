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
    juce::Rectangle<float> frame;   // absolute within the root, set by computeLayout

    /** style + the state variants that currently apply. */
    Style effectiveStyle() const;

    /** Concatenated rawtext of all children (for text nodes). */
    juce::String textContent() const;
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
