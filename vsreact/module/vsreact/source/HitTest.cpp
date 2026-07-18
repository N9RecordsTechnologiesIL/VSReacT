#include "HitTest.h"

#include <algorithm>
#include <vector>

namespace vsreact
{

bool isInteractive (const Node& node)
{
    if (node.type == "textinput" || node.type == "native" || node.type == "rawtext")
        return false;

    return ! node.listeners.isEmpty()
        || ! node.hoverStyle.isEmpty()
        || ! node.activeStyle.isEmpty()
        || node.style.has ("cursor");
}

bool isFocusable (const Node& node)
{
    if (node.type == "native" || node.type == "rawtext")
        return false;

    // Text inputs join the Tab order like web <input>s — the hosted
    // juce::TextEditor takes the actual keyboard focus.
    if (node.type == "textinput")
        return true;

    return node.listeners.contains ("keydown")
        || node.listeners.contains ("keyup")
        || node.listeners.contains ("focus")
        || node.listeners.contains ("blur")
        || ! node.focusStyle.isEmpty();
}

std::vector<Node*> paintOrdered (const std::vector<Node*>& children)
{
    std::vector<Node*> ordered (children.begin(), children.end());

    const auto zIndexOf = [] (const Node* node)
    {
        return node->effectiveStyle().getFloat ("zIndex", 0.0f);
    };

    const bool anyZ = std::any_of (ordered.begin(), ordered.end(),
                                   [&] (const Node* n) { return zIndexOf (n) != 0.0f; });

    if (anyZ)
        std::stable_sort (ordered.begin(), ordered.end(),
                          [&] (const Node* a, const Node* b) { return zIndexOf (a) < zIndexOf (b); });

    return ordered;
}

namespace
{
    Node* hitTestNode (Node& node, juce::Point<float> position)
    {
        if (node.type == "rawtext")
            return nullptr;

        // Transformed nodes paint elsewhere — bring the point back into the
        // node's own (untransformed) space so hits land where pixels are.
        const auto style = node.effectiveStyle();

        // CSS pointer-events: none — the node AND its children are
        // transparent to input.
        if (style.getString ("pointerEvents") == "none")
            return nullptr;

        if (style.hasTransform())
            position = position.transformedBy (style.transformFor (node.frame).inverted());

        const bool contains = node.frame.contains (position);

        // Clipping (hidden or scroll) nodes clip their children's hit areas too.
        if ((style.overflowHidden() || node.isScrollable()) && ! contains)
            return nullptr;

        // Children of a scrolled node live at frame - scrollY on screen, so
        // test them against the point shifted back into unscrolled space.
        const auto childPosition = position.translated (0.0f, node.scrollY);

        // Topmost first: reversed paint order (zIndex, then tree order).
        const auto ordered = paintOrdered (node.children);

        for (auto it = ordered.rbegin(); it != ordered.rend(); ++it)
            if (auto* hit = hitTestNode (**it, childPosition))
                return hit;

        if (contains && isInteractive (node))
            return &node;

        return nullptr;
    }

    Node* scrollableNodeAt (Node& node, juce::Point<float> position)
    {
        if (node.type == "rawtext")
            return nullptr;

        const bool contains = node.frame.contains (position);

        if ((node.style.overflowHidden() || node.isScrollable()) && ! contains)
            return nullptr;

        const auto childPosition = position.translated (0.0f, node.scrollY);

        for (auto it = node.children.rbegin(); it != node.children.rend(); ++it)
            if (auto* found = scrollableNodeAt (**it, childPosition))
                return found;

        return (contains && node.isScrollable()) ? &node : nullptr;
    }

    void collectFocusables (Node& node, std::vector<Node*>& out)
    {
        if (isFocusable (node))
            out.push_back (&node);

        for (auto* child : node.children)
            collectFocusables (*child, out);
    }
}

Node* hitTest (Node& root, juce::Point<float> position)
{
    const auto ordered = paintOrdered (root.children);

    for (auto it = ordered.rbegin(); it != ordered.rend(); ++it)
        if (auto* hit = hitTestNode (**it, position))
            return hit;

    return nullptr;
}

Node* hitTestScrollable (Node& root, juce::Point<float> position)
{
    for (auto it = root.children.rbegin(); it != root.children.rend(); ++it)
        if (auto* found = scrollableNodeAt (**it, position))
            return found;

    return nullptr;
}

Node* nextFocusable (Node& root, int currentId, bool backwards)
{
    std::vector<Node*> focusables;
    collectFocusables (root, focusables);

    if (focusables.empty())
        return nullptr;

    const auto current = std::find_if (focusables.begin(), focusables.end(),
                                       [currentId] (const Node* n) { return n->id == currentId; });

    if (current == focusables.end())
        return backwards ? focusables.back() : focusables.front();

    const auto index = static_cast<size_t> (std::distance (focusables.begin(), current));
    const auto count = focusables.size();
    return focusables[backwards ? (index + count - 1) % count : (index + 1) % count];
}

Node* nearestFocusable (Node* node)
{
    for (; node != nullptr; node = node->parent)
        if (isFocusable (*node))
            return node;

    return nullptr;
}

} // namespace vsreact
