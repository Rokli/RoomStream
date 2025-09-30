#include <iostream>
#include <crow.h>


int main(){
    crow::SimpleApp app;
   
    app.port(8080).multithreaded().run();
    return 0;
}