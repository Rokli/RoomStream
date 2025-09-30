#include "manager_server.hpp"
#include <sstream>

void ManagerServer::handle_websocket_message(crow::websocket::connection& conn, const std::string& data) {
    try {
        auto json = crow::json::load(data);
        if (!json) {
            send_error(conn, "Invalid JSON");
            return;
        }

        std::string type = json["type"].s();
            
        if (type == "user_connect") {
            handle_user_connect(conn, json);
        } else if (type == "room_join") {
            handle_room_join(conn, json);
        } else if (type == "message_send") {
            handle_message_send(conn, json);
        } else if (type == "room_leave") {
            handle_room_leave(conn, json);
        } else {
            send_error(conn, "Unknown message type");
        }

    } catch (const std::exception& e) {
        send_error(conn, "Processing error");
    }
}

void ManagerServer::handle_user_connect(crow::websocket::connection& conn, const crow::json::rvalue& json) {
    std::lock_guard<std::mutex> lock(mtx);
        
    std::string username = json["username"].s();
    users[&conn] = username;
        
    crow::json::wvalue response;
    response["type"] = "user_connected";
    response["user_id"] = "user_" + std::to_string(reinterpret_cast<uintptr_t>(&conn));
    response["username"] = username;
    response["online_users"] = (int)users.size();
        
    conn.send_text(crow_json_to_string(response));
        
    std::cout << "👤 User connected: " << username << std::endl;
}

void ManagerServer::handle_room_join(crow::websocket::connection& conn, const crow::json::rvalue& json) {
    std::lock_guard<std::mutex> lock(mtx);
        
    std::string room_id = json["room_id"].s();
    std::string username = users[&conn];
        
    for (auto& [room_name, connections] : rooms) {
        connections.erase(&conn);
    }
        
    rooms[room_id].insert(&conn);
        
    crow::json::wvalue notification;
    notification["type"] = "user_joined";
    notification["room_id"] = room_id;
    notification["username"] = username;
    notification["users_count"] = (int)rooms[room_id].size();
        
    broadcast_to_room(room_id, crow_json_to_string(notification), &conn);
        
    crow::json::wvalue response;
    response["type"] = "room_joined";
    response["room_id"] = room_id;
    response["username"] = username;
    response["users_count"] = (int)rooms[room_id].size();
        
    conn.send_text(crow_json_to_string(response));
        
    std::cout << "🚪 " << username << " joined room: " << room_id << std::endl;
}

void ManagerServer::handle_message_send(crow::websocket::connection& conn, const crow::json::rvalue& json) {
    std::lock_guard<std::mutex> lock(mtx);
        
    std::string room_id = json["room_id"].s();
    std::string username = users[&conn];
    std::string text = json["text"].s();
    std::string message_id = json["message_id"].s();
        
    crow::json::wvalue message;
    message["type"] = "message_receive";
    message["room_id"] = room_id;
    message["message_id"] = message_id;
    message["username"] = username;
    message["text"] = text;
    message["timestamp"] = std::to_string(std::time(nullptr));
    
    broadcast_to_room(room_id, crow_json_to_string(message));
        
    std::cout << "💬 " << username << " in " << room_id << ": " << text << std::endl;
}

void ManagerServer::handle_room_leave(crow::websocket::connection& conn, const crow::json::rvalue& json) {
    std::lock_guard<std::mutex> lock(mtx);
        
    std::string room_id = json["room_id"].s();
    std::string username = users[&conn];
        
    rooms[room_id].erase(&conn);
        
    crow::json::wvalue notification;
    notification["type"] = "user_left";
    notification["room_id"] = room_id;
    notification["username"] = username;
    notification["users_count"] = (int)rooms[room_id].size();
        
    broadcast_to_room(room_id, crow_json_to_string(notification));
        
    std::cout << "👋 " << username << " left room: " << room_id << std::endl;
}

void ManagerServer::broadcast_to_room(const std::string& room_id, const std::string& message, 
                          crow::websocket::connection* exclude) {
    if (rooms.find(room_id) == rooms.end()) return;
        
    for (auto conn : rooms[room_id]) {
        if (conn != exclude) {
            conn->send_text(message);
        }
    }
}

void ManagerServer::send_error(crow::websocket::connection& conn, const std::string& message) {
    crow::json::wvalue error;
    error["type"] = "error";
    error["data"]["message"] = message; 
    conn.send_text(crow_json_to_string(error));
}

std::string ManagerServer::crow_json_to_string(const crow::json::wvalue& json) {
    return json.dump();
}