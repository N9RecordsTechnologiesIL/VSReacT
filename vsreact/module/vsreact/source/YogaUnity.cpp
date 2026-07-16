// Unity build of the vendored Yoga layout engine, with its warnings silenced
// so consumers can keep strict warning levels for their own code.

#if _MSC_VER
 #pragma warning(push)
 #pragma warning(disable : 4018) // signed/unsigned mismatch
 #pragma warning(disable : 4127) // conditional expression is constant
 #pragma warning(disable : 4244) // possible loss of data
 #pragma warning(disable : 4505) // unreferenced local function
 #pragma warning(disable : 4611) // object destruction is non-portable
 #pragma warning(disable : 4702) // unreachable code
 #pragma warning(disable : 4100 4459)
#elif __clang__
 #pragma clang diagnostic push
 #pragma clang diagnostic ignored "-Weverything"
#elif __GNUC__
 #pragma GCC diagnostic push
 #pragma GCC diagnostic ignored "-Wzero-as-null-pointer-constant"
 #pragma GCC diagnostic ignored "-Wsign-conversion"
 #pragma GCC diagnostic ignored "-Wswitch-enum"
 #pragma GCC diagnostic ignored "-Wunused-variable"
 #pragma GCC diagnostic ignored "-Wredundant-decls"
 #pragma GCC diagnostic ignored "-Wpedantic"
#endif

#include "yoga/log.cpp"
#include "yoga/event/event.cpp"
#include "yoga/Utils.cpp"
#include "yoga/YGConfig.cpp"
#include "yoga/YGEnums.cpp"
#include "yoga/YGLayout.cpp"
#include "yoga/YGNode.cpp"
#include "yoga/YGNodePrint.cpp"
#include "yoga/YGStyle.cpp"
#include "yoga/YGValue.cpp"
#include "yoga/Yoga.cpp"

#if _MSC_VER
 #pragma warning(pop)
#elif __clang__
 #pragma clang diagnostic pop
#elif __GNUC__
 #pragma GCC diagnostic pop
#endif
