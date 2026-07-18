#pragma once

#include "ShadowTree.h"

namespace vsreact
{

/** True if the node reacts to pointer input (listeners, hover/active styles,
    or an explicit cursor). Hosted components (textinput/native) receive JUCE
    mouse events directly and are excluded. */
bool isInteractive (const Node& node);

/** Topmost interactive node under the point, respecting paint order (later
    siblings on top), overflow clipping, and scroll offsets. Returns nullptr
    when nothing interactive is hit. */
Node* hitTest (Node& root, juce::Point<float> position);

/** Deepest overflow:"scroll" node under the point (the wheel-scroll target),
    or nullptr. */
Node* hitTestScrollable (Node& root, juce::Point<float> position);

/** True if the node can take keyboard focus: it listens for keydown /
    focus / blur, or declares a focusStyle. */
bool isFocusable (const Node& node);

/** The next focusable node after `currentId` in tree (DFS) order, wrapping;
    backwards for Shift-Tab. Returns nullptr when nothing is focusable. */
Node* nextFocusable (Node& root, int currentId, bool backwards);

/** Nearest focusable node at or above `node` (for click-to-focus). */
Node* nearestFocusable (Node* node);

/** Children in paint order: stable-sorted by the zIndex style key (later
    siblings still win ties). Hit-testing walks this reversed. */
std::vector<Node*> paintOrdered (const std::vector<Node*>& children);

} // namespace vsreact
