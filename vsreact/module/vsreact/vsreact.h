/*
==============================================================================

  VSReacT — write native JUCE plugin UIs in modern React + TypeScript.

  A custom React renderer: the app runs in an embedded QuickJS engine, a
  react-reconciler host config streams mutations over a C bridge, C++ keeps a
  shadow tree laid out with Yoga flexbox and paints it with juce::Graphics.

==============================================================================

BEGIN_JUCE_MODULE_DECLARATION

  ID:               vsreact
  vendor:           vsreact
  version:          0.1.0
  name:             VSReacT
  description:      React UI framework for JUCE plugins
  website:          https://github.com/n9records/vsreact
  license:          MIT
  minimumCppStandard: 17

  dependencies:     juce_gui_extra juce_audio_processors

END_JUCE_MODULE_DECLARATION

==============================================================================
*/

#pragma once
#define VSREACT_H_INCLUDED

#include <juce_gui_basics/juce_gui_basics.h>
#include <juce_gui_extra/juce_gui_extra.h>

#include "source/JsRuntime.h"
#include "source/Scheduler.h"
#include "source/FontRegistry.h"
#include "source/ImageRegistry.h"
#include "source/RenderResources.h"
#include "source/Style.h"
#include "source/CanvasSurface.h"
#include "source/ShadowTree.h"
#include "source/TextSelection.h"
#include "source/Blur.h"
#include "source/WebpImage.h"
#include "source/Painter.h"
#include "source/HitTest.h"
#include "source/NativeRegistry.h"
#include "source/TextInputHost.h"
#include "source/ParameterBridge.h"
#include "source/PostHogBridge.h"
#include "source/ErrorOverlay.h"
#include "source/RootView.h"

namespace vsreact
{
    /** Constructs and destroys a QuickJS runtime and a Yoga node, proving the
        third-party pieces compiled and linked. Used by the unit tests. */
    bool frameworkSanityCheck();
}
