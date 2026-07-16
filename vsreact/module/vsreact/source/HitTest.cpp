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

namespace
{
    Node* hitTestNode (Node& node, juce::Point<float> position)
    {
        if (node.type == "rawtext")
            return nullptr;

        const bool contains = node.frame.contains (position);

        // Clipping (hidden or scroll) nodes clip their children's hit areas too.
        if ((node.style.overflowHidden() || node.isScrollable()) && ! contains)
            return nullptr;

        // Children of a scrolled node live at frame - scrollY on screen, so
        // test them against the point shifted back into unscrolled space.
        const auto childPosition = position.translated (0.0f, node.scrollY);

        // Later siblings paint on top, so test them first.
        for (auto it = node.children.rbegin(); it != node.children.rend(); ++it)
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
}

Node* hitTest (Node& root, juce::Point<float> position)
{
    for (auto it = root.children.rbegin(); it != root.children.rend(); ++it)
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

} // namespace vsreact
