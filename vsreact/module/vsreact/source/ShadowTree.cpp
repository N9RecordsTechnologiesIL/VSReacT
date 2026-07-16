#include "ShadowTree.h"

namespace vsreact
{

Style Node::effectiveStyle() const
{
    auto result = style;

    if (hovered && ! hoverStyle.isEmpty())
        result = result.mergedWith (hoverStyle);

    if (active && ! activeStyle.isEmpty())
        result = result.mergedWith (activeStyle);

    if (focused && ! focusStyle.isEmpty())
        result = result.mergedWith (focusStyle);

    return result;
}

float Node::contentHeight() const
{
    float maxBottom = frame.getY();

    for (const auto* child : children)
        if (child->yoga != nullptr)
            maxBottom = juce::jmax (maxBottom, child->frame.getBottom());

    const auto paddingBottom = style.getFloat ("paddingBottom", style.getFloat ("padding", 0.0f));
    return maxBottom - frame.getY() + paddingBottom;
}

float Node::accumulatedAncestorScroll() const
{
    float total = 0.0f;

    for (const auto* ancestor = parent; ancestor != nullptr; ancestor = ancestor->parent)
        total += ancestor->scrollY;

    return total;
}

juce::String Node::textContent() const
{
    if (type == "rawtext")
        return text;

    juce::String result;

    for (const auto* child : children)
        result << child->textContent();

    return result;
}

//==============================================================================
namespace
{
    YGSize measureTextNode (YGNodeRef yogaNode,
                            float width, YGMeasureMode widthMode,
                            float, YGMeasureMode)
    {
        const auto* node = static_cast<const Node*> (YGNodeGetContext (yogaNode));

        if (node == nullptr)
            return { 0.0f, 0.0f };

        const auto text = node->textContent();

        if (text.isEmpty())
            return { 0.0f, 0.0f };

        const auto maxWidth = widthMode == YGMeasureModeUndefined ? 1.0e6f : width;

        juce::AttributedString attributed;
        attributed.setText (text);
        attributed.setFont (node->style.font());

        juce::TextLayout layout;
        layout.createLayout (attributed, maxWidth);

        auto measuredHeight = layout.getHeight();
        const auto lineHeight = node->style.getFloat ("lineHeight", 0.0f);

        if (lineHeight > 0.0f && layout.getNumLines() > 0)
            measuredHeight = lineHeight * static_cast<float> (layout.getNumLines());

        // +1 guards against wrap flapping from float rounding.
        return { std::ceil (layout.getWidth()) + 1.0f, std::ceil (measuredHeight) };
    }
}

//==============================================================================
ShadowTree::ShadowTree()
{
    rootNode.id = 0;
    rootNode.type = "root";
    rootNode.yoga = YGNodeNew();
}

ShadowTree::~ShadowTree()
{
    YGNodeFreeRecursive (rootNode.yoga);

    for (auto& [id, node] : nodes)
        node->yoga = nullptr;   // freed by the recursive call above
}

void ShadowTree::applyOpsJson (const juce::String& json)
{
    applyOps (juce::JSON::parse (json));
}

void ShadowTree::applyOps (const juce::var& opsArray)
{
    if (const auto* ops = opsArray.getArray())
        for (const auto& op : *ops)
            applyOp (op);
}

void ShadowTree::applyOp (const juce::var& op)
{
    const auto* parts = op.getArray();

    if (parts == nullptr || parts->isEmpty())
        return;

    const auto name = parts->getUnchecked (0).toString();
    const auto intAt = [parts] (int i) { return static_cast<int> (parts->getUnchecked (i)); };

    if (name == "create")            createNode (intAt (1), parts->getUnchecked (2).toString());
    else if (name == "setProps")     setProps (intAt (1), parts->getUnchecked (2));
    else if (name == "appendChild")  appendChild (intAt (1), intAt (2));
    else if (name == "insertBefore") insertBefore (intAt (1), intAt (2), intAt (3));
    else if (name == "removeChild")  removeChild (intAt (1), intAt (2));
    else if (name == "setText")      setText (intAt (1), parts->getUnchecked (2).toString());
    else if (name == "clearContainer")
    {
        while (! rootNode.children.empty())
            removeChild (0, rootNode.children.front()->id);
    }
    else
    {
        jassertfalse;   // unknown mutation op — protocol mismatch
        return;
    }

    layoutDirty = true;
}

Node* ShadowTree::find (int id)
{
    if (id == 0)
        return &rootNode;

    const auto it = nodes.find (id);
    return it != nodes.end() ? it->second.get() : nullptr;
}

//==============================================================================
void ShadowTree::createNode (int id, const juce::String& type)
{
    jassert (find (id) == nullptr);

    auto node = std::make_unique<Node>();
    node->id = id;
    node->type = type;

    if (type != "rawtext")
    {
        node->yoga = YGNodeNew();

        if (type == "text")
        {
            YGNodeSetContext (node->yoga, node.get());
            YGNodeSetMeasureFunc (node->yoga, measureTextNode);
        }
    }

    auto& ref = *node;
    nodes[id] = std::move (node);

    if (onNodeCreated != nullptr)
        onNodeCreated (ref);
}

void ShadowTree::setProps (int id, const juce::var& props)
{
    auto* node = find (id);

    if (node == nullptr)
        return;

    node->props = props;
    node->style = Style::fromVar (props["style"]);
    node->hoverStyle = Style::fromVar (props["hoverStyle"]);
    node->activeStyle = Style::fromVar (props["activeStyle"]);
    node->focusStyle = Style::fromVar (props["focusStyle"]);

    node->listeners.clear();

    if (const auto* listeners = props["listeners"].getArray())
        for (const auto& listener : *listeners)
            node->listeners.add (listener.toString());

    if (const auto* object = props.getDynamicObject())
        if (object->hasProperty ("scrollTop"))
            node->scrollY = static_cast<float> (static_cast<double> (props["scrollTop"]));

    if (node->yoga != nullptr)
    {
        node->style.applyLayout (node->yoga);

        if (node->type == "text")
            YGNodeMarkDirty (node->yoga);
    }

    markTextDirty (*node);

    if (onNodePropsChanged != nullptr)
        onNodePropsChanged (*node);
}

void ShadowTree::appendChild (int parentId, int childId)
{
    auto* parent = find (parentId);
    auto* child = find (childId);

    if (parent == nullptr || child == nullptr)
        return;

    detachFromParent (*child);
    attachChild (*parent, *child, static_cast<int> (parent->children.size()));
}

void ShadowTree::insertBefore (int parentId, int childId, int beforeId)
{
    auto* parent = find (parentId);
    auto* child = find (childId);
    auto* before = find (beforeId);

    if (parent == nullptr || child == nullptr || before == nullptr)
        return;

    detachFromParent (*child);

    const auto it = std::find (parent->children.begin(), parent->children.end(), before);
    attachChild (*parent, *child, static_cast<int> (it - parent->children.begin()));
}

void ShadowTree::removeChild (int parentId, int childId)
{
    auto* child = find (childId);

    if (child == nullptr || child->parent == nullptr || child->parent->id != parentId)
        return;

    detachFromParent (*child);

    if (child->yoga != nullptr)
        YGNodeFreeRecursive (child->yoga);

    destroySubtree (*child);
}

void ShadowTree::setText (int id, const juce::String& text)
{
    auto* node = find (id);

    if (node == nullptr)
        return;

    node->text = text;
    markTextDirty (*node);
}

//==============================================================================
void ShadowTree::detachFromParent (Node& child)
{
    auto* parent = child.parent;

    if (parent == nullptr)
        return;

    const auto it = std::find (parent->children.begin(), parent->children.end(), &child);

    if (it != parent->children.end())
        parent->children.erase (it);

    if (child.yoga != nullptr && YGNodeGetOwner (child.yoga) != nullptr)
        YGNodeRemoveChild (YGNodeGetOwner (child.yoga), child.yoga);

    markTextDirty (*parent);
    child.parent = nullptr;
}

void ShadowTree::attachChild (Node& parent, Node& child, int index)
{
    index = juce::jlimit (0, static_cast<int> (parent.children.size()), index);

    // Yoga index counts only the yoga-attached siblings before this one.
    int yogaIndex = 0;

    for (int i = 0; i < index; ++i)
        if (parent.children[static_cast<size_t> (i)]->yoga != nullptr)
            ++yogaIndex;

    parent.children.insert (parent.children.begin() + index, &child);
    child.parent = &parent;

    // text nodes measure their own content — their children stay out of yoga.
    if (child.yoga != nullptr && parent.yoga != nullptr && parent.type != "text")
        YGNodeInsertChild (parent.yoga, child.yoga, static_cast<uint32_t> (yogaIndex));

    markTextDirty (parent);
}

void ShadowTree::destroySubtree (Node& node)
{
    for (auto* child : std::vector<Node*> (node.children))
        destroySubtree (*child);

    node.children.clear();

    if (onNodeRemoved != nullptr)
        onNodeRemoved (node);

    node.yoga = nullptr;   // freed (recursively) by removeChild
    nodes.erase (node.id);
}

void ShadowTree::markTextDirty (Node& node)
{
    for (auto* current = &node; current != nullptr; current = current->parent)
    {
        if (current->type == "text" && current->yoga != nullptr)
        {
            YGNodeMarkDirty (current->yoga);
            return;
        }
    }
}

//==============================================================================
namespace
{
    void assignFrames (Node& node, juce::Point<float> origin)
    {
        if (node.yoga != nullptr)
        {
            node.frame = { origin.x + YGNodeLayoutGetLeft (node.yoga),
                           origin.y + YGNodeLayoutGetTop (node.yoga),
                           YGNodeLayoutGetWidth (node.yoga),
                           YGNodeLayoutGetHeight (node.yoga) };
        }
        else if (node.parent != nullptr)
        {
            node.frame = node.parent->frame;
        }

        for (auto* child : node.children)
            assignFrames (*child, node.frame.getPosition());
    }
}

void ShadowTree::computeLayout (float width, float height)
{
    YGNodeStyleSetWidth (rootNode.yoga, width);
    YGNodeStyleSetHeight (rootNode.yoga, height);
    YGNodeCalculateLayout (rootNode.yoga, width, height, YGDirectionLTR);

    assignFrames (rootNode, { 0.0f, 0.0f });
    layoutDirty = false;
}

} // namespace vsreact
