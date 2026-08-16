# {{PRODUCT_NAME}} — a native JUCE plugin whose UI is React (VSReacT).
#
#   cd ui && bun install && bun run build
#   cmake -S . -B build [-DJUCE_SOURCE_DIR=/path/to/JUCE]
#   cmake --build build --target {{TARGET}}_Standalone --config Release
#
# Dev builds (default) load ui/build/main.js from disk and hot-reload it.
# Ship builds embed the bundle:  cmake -B build -D{{TARGET_UPPER}}_DEV=OFF

cmake_minimum_required(VERSION 3.24)

project({{TARGET}} VERSION 0.1.0)

include(FetchContent)

# JUCE: point JUCE_SOURCE_DIR at a local checkout, or let CMake fetch it.
set(JUCE_SOURCE_DIR "" CACHE PATH "Optional path to a local JUCE checkout")

if (JUCE_SOURCE_DIR)
    add_subdirectory("${JUCE_SOURCE_DIR}" JUCE EXCLUDE_FROM_ALL)
else()
    FetchContent_Declare(JUCE
        GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
        # 8.0.14+, not 8.0.4: on Linux, 8.0.4's text shaper segfaults when a
        # custom font is missing a glyph for a non-ASCII character.
        GIT_TAG        8.0.14
        GIT_SHALLOW    TRUE)
    FetchContent_MakeAvailable(JUCE)
endif()

# VSReacT: the native module (QuickJS + Yoga + the React renderer).
set(VSREACT_GIT_TAG "{{VSREACT_TAG}}" CACHE STRING "VSReacT release tag")
set(VSREACT_BUILD_TESTS OFF CACHE BOOL "" FORCE)

FetchContent_Declare(vsreact
    GIT_REPOSITORY https://github.com/N9RecordsTechnologiesIL/VSReacT.git
    GIT_TAG        ${VSREACT_GIT_TAG}
    GIT_SHALLOW    TRUE
    SOURCE_SUBDIR  vsreact)
FetchContent_MakeAvailable(vsreact)

option({{TARGET_UPPER}}_DEV "Load the UI bundle from disk and watch it (hot reload)" ON)

juce_add_plugin({{TARGET}}
    COMPANY_NAME "{{COMPANY}}"
    PRODUCT_NAME "{{PRODUCT_NAME}}"
    # Set explicitly: JUCE derives this from the company and product names,
    # which may contain spaces — invalid in a bundle id, and fatal on macOS.
    BUNDLE_ID "{{BUNDLE_ID}}"
    PLUGIN_MANUFACTURER_CODE {{MFR_CODE}}
    PLUGIN_CODE {{PLUGIN_CODE}}
    FORMATS VST3 Standalone
    IS_SYNTH FALSE
    NEEDS_MIDI_INPUT FALSE
    NEEDS_MIDI_OUTPUT FALSE
    COPY_PLUGIN_AFTER_BUILD FALSE)

target_sources({{TARGET}} PRIVATE Source/Plugin.cpp)

# The UI bundle is embedded via BinaryData for ship builds; write a stub so
# a fresh configure works before the first `bun run build`.
if (NOT EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/ui/build/main.js")
    file(WRITE "${CMAKE_CURRENT_SOURCE_DIR}/ui/build/main.js"
        "// placeholder — run `bun run build` in ui/\n")
endif()

juce_add_binary_data({{TARGET}}Assets SOURCES ui/build/main.js)

target_compile_definitions({{TARGET}}
    PRIVATE
        JUCE_WEB_BROWSER=0
        JUCE_USE_CURL=0
        JUCE_VST3_CAN_REPLACE_VST2=0
        {{TARGET_UPPER}}_DEV=$<BOOL:${{{TARGET_UPPER}}_DEV}>
        {{TARGET_UPPER}}_UI_BUNDLE_PATH="${CMAKE_CURRENT_SOURCE_DIR}/ui/build/main.js")

target_link_libraries({{TARGET}}
    PRIVATE
        vsreact
        {{TARGET}}Assets
        juce::juce_audio_utils
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_warning_flags)
