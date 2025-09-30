#include <iostream>
#include "StaticFileServer.h"

int main(){
    crow::SimpleApp app;
    StaticFileServer file_server("front/");

    CROW_ROUTE(app, "/")([&file_server](){
        return file_server.serve_file("index.html");
    });

    CROW_ROUTE(app, "/<string>")([&file_server](const std::string& filename){
        return file_server.serve_file(filename);
    });

    app.port(8081).multithreaded().run();
    return 0;
}