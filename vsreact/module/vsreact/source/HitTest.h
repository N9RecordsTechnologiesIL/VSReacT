#pragma once

#include "ShadowTree.h"

namespace vsreact
{

/** True if the node reacts to pointer input (listeners, hover/active styles,
    or an explicit cursor). Hosted components (textinput/native) receive JUCE
    mouse events directly and are excluded. */
bool isInteractive (const Node& node);

/** Topmost interactive node under the point, respecting paint order (later
    siblings on top) and overflow clipping. Returns nullptr when nothing
    interactive is hit. */
Node* hitTest (Node& root, juce::Point<float> position);

} // namespace vsreact
