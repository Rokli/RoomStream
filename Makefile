CXX := g++
CXXFLAGS := -std=c++17 -O2 -Wall -Wextra -pthread
LIBS := -lboost_system -pthread
SOURCES := $(wildcard src/*.cpp)
TARGET := server

$(TARGET): $(SOURCES)
	$(CXX) $(CXXFLAGS) -o $@ $(SOURCES) $(LIBS)

clean:
	rm -f $(TARGET)

run: $(TARGET)
	./$(TARGET)

.PHONY: clean run