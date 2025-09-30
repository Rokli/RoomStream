#ifndef MANAGER_SERVER_HPP
#define MANAGER_SEVER_HPP

#include <mutex>
#include <map>
#include <string>
#include <set>
#include <crow.h>
#include <sstream>

class ManagerServer{
private:
    std::mutex mtx;
    std::map<std::string, std::set<crow::websocket::connection*>> rooms;
    std::map<crow::websocket::connection*, std::string> users;

public:
    void handle_websocket_message(crow::websocket::connection& conn, const std::string& data);
private:
    void handle_user_connect(crow::websocket::connection& conn, const crow::json::rvalue& json);
    void handle_room_join(crow::websocket::connection& conn, const crow::json::rvalue& json);
    void handle_message_send(crow::websocket::connection& conn, const crow::json::rvalue& json);
    void handle_room_leave(crow::websocket::connection& conn, const crow::json::rvalue& json);
    void broadcast_to_room(const std::string& room_id, const std::string& message, 
                          crow::websocket::connection* exclude = nullptr);
    void send_error(crow::websocket::connection& conn, const std::string& message);    
    std::string crow_json_to_string(const crow::json::wvalue& json);
};

#endif //MANAGER_SERVER_HPP