# VSReacT — React UI framework for JUCE plugins.
#
# Consume via add_subdirectory() from a project that has already added JUCE:
#
#   add_subdirectory("path/to/vsreact" vsreact-build)
#   target_link_libraries(MyPlugin PRIVATE vsreact)

set(QJS_ENABLE_INSTALL OFF CACHE BOOL "" FORCE)
set(QJS_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)

add_subdirectory(third_party/quickjs-ng quickjs-ng EXCLUDE_FROM_ALL)

juce_add_module(module/vsreact)

target_include_directories(vsreact INTERFACE
    "${CMAKE_CURRENT_SOURCE_DIR}/third_party/yoga")

target_link_libraries(vsreact INTERFACE qjs)

option(VSREACT_BUILD_TESTS "Build VSReacT unit tests" ON)

if (VSREACT_BUILD_TESTS)
    add_subdirectory(tests)
endif()
