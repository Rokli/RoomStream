CXX := g++
CXXFLAGS :=-Wall -Wextra
LIBS := -lboost_system
INCLUDES := -Iinclude

STATIC_SERVER_SOURCES := $(wildcard src/static_server/*.cpp)
BACKEND_SERVER_SOURCES := $(wildcard src/backend_server/*.cpp)

STATIC_TARGET := static_server
BACKEND_TARGET := backend_server

$(STATIC_TARGET): $(STATIC_SERVER_SOURCES)
	$(CXX) $(CXXFLAGS) $(INCLUDES) -o $@ $^ $(LIBS)

$(BACKEND_TARGET): $(BACKEND_SERVER_SOURCES)
	$(CXX) $(CXXFLAGS) $(INCLUDES) -o $@ $^ $(LIBS)

all: $(STATIC_TARGET) $(BACKEND_TARGET)

clean:
	rm -f $(STATIC_TARGET) $(BACKEND_TARGET)

run_static: $(STATIC_TARGET)
	./$(STATIC_TARGET)

run_backend: $(BACKEND_TARGET)
	./$(BACKEND_TARGET)

.PHONY: all clean run_static run_backend