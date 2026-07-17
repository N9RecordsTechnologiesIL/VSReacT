# VSReacT — React UI framework for JUCE plugins.
#
# Consume via add_subdirectory() from a project that has already added JUCE:
#
#   add_subdirectory("path/to/vsreact" vsreact-build)
#   target_link_libraries(MyPlugin PRIVATE vsreact)

set(QJS_ENABLE_INSTALL OFF CACHE BOOL "" FORCE)
set(QJS_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)

add_subdirectory(third_party/quickjs-ng quickjs-ng EXCLUDE_FROM_ALL)

# Linux VST3s are shared objects, so everything linked in needs PIC
# (ld: "relocation R_X86_64_PC32 against js_realloc ... recompile with -fPIC").
set_target_properties(qjs PROPERTIES POSITION_INDEPENDENT_CODE ON)

juce_add_module(module/vsreact)

target_include_directories(vsreact INTERFACE
    "${CMAKE_CURRENT_SOURCE_DIR}/third_party/yoga")

target_link_libraries(vsreact INTERFACE qjs)

# Off by default so FetchContent/add_subdirectory consumers get just the
# module; the CI entry point forces this ON.
option(VSREACT_BUILD_TESTS "Build VSReacT unit tests" OFF)

if (VSREACT_BUILD_TESTS)
    add_subdirectory(tests)
endif()
