#ifdef VSREACT_H_INCLUDED
 /* When you add this cpp file to your project, you mustn't include it in a
    file where you've already included vsreact.h. */
 #error "Incorrect use of the VSReacT module cpp file"
#endif

#include "vsreact.h"

#include "source/YogaUnity.cpp"

#include "source/JsRuntime.cpp"
#include "source/Scheduler.cpp"
#include "source/Style.cpp"
#include "source/ShadowTree.cpp"
#include "source/Painter.cpp"
#include "source/HitTest.cpp"
#include "source/RootView.cpp"
#include "source/ParameterBridge.cpp"
#include "source/PostHogBridge.cpp"

#include <quickjs.h>

namespace vsreact
{
    bool frameworkSanityCheck()
    {
        auto* rt = JS_NewRuntime();

        if (rt == nullptr)
            return false;

        auto* ctx = JS_NewContext (rt);
        const bool contextOk = ctx != nullptr;

        if (ctx != nullptr)
            JS_FreeContext (ctx);

        JS_FreeRuntime (rt);

        auto* node = YGNodeNew();
        const bool yogaOk = node != nullptr;

        if (node != nullptr)
            YGNodeFree (node);

        return contextOk && yogaOk;
    }
}
