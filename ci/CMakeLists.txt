# CI entry point: builds the vsreact module + unit tests against a JUCE
# checkout. Used by .github/workflows/ci.yml; also handy locally:
#
#   cmake -S ci -B ci/build -DJUCE_SOURCE_DIR=path/to/JUCE -DCMAKE_BUILD_TYPE=Release
#   cmake --build ci/build --config Release
#   ctest --test-dir ci/build -C Release --output-on-failure

cmake_minimum_required(VERSION 3.22)

project(VSReacTCI VERSION 0.0.6)

enable_testing()

set(VSREACT_BUILD_TESTS ON CACHE BOOL "" FORCE)

set(JUCE_SOURCE_DIR "" CACHE PATH "Path to a JUCE checkout")

if (NOT EXISTS "${JUCE_SOURCE_DIR}/CMakeLists.txt")
    message(FATAL_ERROR "Pass -DJUCE_SOURCE_DIR=path/to/JUCE")
endif()

add_subdirectory("${JUCE_SOURCE_DIR}" JUCE EXCLUDE_FROM_ALL)
add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/../vsreact" vsreact-build)
