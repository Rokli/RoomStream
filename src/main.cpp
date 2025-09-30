#include <iostream>
#include <crow.h>

int main(){
    crow::SimpleApp app;

    // Определяем маршрут
    CROW_ROUTE(app, "/")([](){
        return "Hello, Crow!";
    });

    // Запускаем сервер на порту 8080
    app.port(8080).multithreaded().run();
    return 0;
}