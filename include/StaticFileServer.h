#pragma once

#include <string>
#include <crow.h>

class StaticFileServer {

public:
    StaticFileServer(const std::string& dir = "") : base_dir(dir) {}

    crow::response serve_file(const std::string& filename);

private:
    std::string base_dir;
    std::string get_content_type(const std::string& filename);
};
