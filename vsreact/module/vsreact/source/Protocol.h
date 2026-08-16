#pragma once

namespace vsreact
{

/** The version of the JS→C++ mutation protocol this module implements.

    JsRuntime publishes it to JS as the `__vsreact_protocol` global before the
    bundle is evaluated, so a bundle that is *newer* than the native module it
    runs against can degrade instead of silently freezing.

    That failure matters because it is invisible. ShadowTree::applyOp ignores
    an op it doesn't recognise, and its `jassertfalse` compiles out in Release
    — so a UI built with a newer @vsreact/core than the module pinned by the
    CMake GIT_TAG paints its first frame and then never updates again, with no
    error, no overlay and nothing in the log. Bumping @vsreact/core without
    bumping the module is a one-line mistake, so the handshake is worth having.

    History:
      1  create, setProps, appendChild, insertBefore, removeChild, setText,
         clearContainer.
      2  patchProps — key-granular prop updates, where a JSON null removes a
         key. Image interning: an <Image src> may be an "img:N" handle handed
         out by __vsreact_registerImage.

    Publication only started at 0.0.30, so every earlier module — including
    0.0.28/0.0.29, which already implement the level-2 ops — publishes no
    global and is read by JS as level 1. That under-reports those two
    versions on purpose: a newer bundle can't tell them from 0.0.27, and
    setProps is accepted by all of them. Safe, merely chattier.

    Bump this whenever a new op — or a new kind of value an existing prop may
    carry — would be misread by the previous level, and gate the emitting side
    in JS on `nativeProtocol()` (see js/src/protocol.ts). Keep a level-1
    fallback wherever one exists: patchProps has one, because setProps is a
    strict superset of it. A future feature that cannot degrade should fail
    loudly through the error overlay rather than quietly do nothing. */
inline constexpr int protocolVersion = 2;

} // namespace vsreact
