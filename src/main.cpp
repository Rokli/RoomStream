#include <iostream>
#include <crow.h>

class StaticFileServer {
private:
    std::string base_dir;

public:
    StaticFileServer(const std::string& dir = "") : base_dir(dir) {}

    crow::response serve_file(const std::string& filename) {
        std::string filepath = base_dir + filename;
        
        std::cout << "Serving file: " << filepath << std::endl;
        
        std::ifstream file(filepath, std::ios::binary);
        if (!file.is_open()) {
            std::cout << "File not found: " << filepath << std::endl;
            return crow::response(404, "File not found: " + filename);
        }
        
        std::string content((std::istreambuf_iterator<char>(file)),
                           std::istreambuf_iterator<char>());
        
        std::string content_type = get_content_type(filename);
        
        auto response = crow::response(content);
        response.set_header("Content-Type", content_type);
        response.set_header("Cache-Control", "max-age=3600"); 
        return response;
    }

private:
    std::string get_content_type(const std::string& filename) {
        std::map<std::string, std::string> content_types = {
            {".html", "text/html; charset=utf-8"},
            {".htm", "text/html; charset=utf-8"},
            {".css", "text/css"},
            {".js", "application/javascript"},
            {".png", "image/png"},
            {".jpg", "image/jpeg"},
            {".jpeg", "image/jpeg"},
            {".gif", "image/gif"},
            {".svg", "image/svg+xml"},
            {".json", "application/json"},
            {".txt", "text/plain"}
        };
        
        for (const auto& [ext, type] : content_types) {
            if (filename.size() >= ext.size() && 
                filename.compare(filename.size() - ext.size(), ext.size(), ext) == 0) {
                return type;
            }
        }
        
        return "application/octet-stream";
    }
};


int main(){
    crow::SimpleApp app;
    StaticFileServer file_server("front/");

    CROW_ROUTE(app, "/")([&file_server](){
        return file_server.serve_file("index.html");
    });

    CROW_ROUTE(app, "/<string>")([&file_server](const std::string& filename){
        return file_server.serve_file(filename);
    });

    app.port(8080).multithreaded().run();
    app.port(8081).multithreaded().run();
    return 0;
}