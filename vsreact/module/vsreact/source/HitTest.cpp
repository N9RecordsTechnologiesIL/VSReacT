#include "HitTest.h"

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

        // A clipping node clips its children's hit areas too.
        if (node.style.overflowHidden() && ! contains)
            return nullptr;

        // Later siblings paint on top, so test them first.
        for (auto it = node.children.rbegin(); it != node.children.rend(); ++it)
            if (auto* hit = hitTestNode (**it, position))
                return hit;

        if (contains && isInteractive (node))
            return &node;

        return nullptr;
    }
}

Node* hitTest (Node& root, juce::Point<float> position)
{
    for (auto it = root.children.rbegin(); it != root.children.rend(); ++it)
        if (auto* hit = hitTestNode (**it, position))
            return hit;

    return nullptr;
}

} // namespace vsreact
