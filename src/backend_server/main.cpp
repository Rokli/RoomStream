#include <iostream>
#include "manager_server.hpp"


int main() {
    ManagerServer chat_manager;
    crow::SimpleApp app;
   
    CROW_WEBSOCKET_ROUTE(app, "/ws")
        .onopen([](crow::websocket::connection& conn) {
            std::cout << "🔌 New WebSocket connection" << std::endl;
        })
        .onmessage([&chat_manager](crow::websocket::connection& conn, const std::string& data, bool is_binary) {
            if (!is_binary) {
                chat_manager.handle_websocket_message(conn, data);
            }
        })
        .onclose([](crow::websocket::connection& conn, const std::string& reason, uint16_t code) {
            std::cout << "❌ WebSocket closed: " << reason 
                      << " (code " << code << ")" << std::endl;
        });

    // API статуса
    CROW_ROUTE(app, "/api/status")([]() {
        crow::json::wvalue json;
        json["status"] = "online";
        json["service"] = "ChatCube";
        json["version"] = "1.0";
        return json;
    });

    std::cout << "🚀 Server started at http://localhost:8080" << std::endl;
    std::cout << "📁 Serving files from: front/" << std::endl;
    std::cout << "🔌 WebSocket: ws://localhost:8080/ws" << std::endl;

    app.port(8080).multithreaded().run();
    return 0;
}
