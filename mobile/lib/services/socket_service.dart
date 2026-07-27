import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:flutter/foundation.dart';
import '../config/app_config.dart';
import 'api_service.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  IO.Socket? socket;

  Future<void> initSocket(String tenantId) async {
    if (socket != null && socket!.connected) return;

    final baseUrl = AppConfig.socketUrl;
    final token = await ApiService().getToken();

    debugPrint('Initializing socket connection to $baseUrl');

    socket = IO.io(
      baseUrl,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .enableAutoConnect()
          .setAuth({'token': token})
          .build(),
    );

    socket!.onConnect((_) {
      debugPrint('Connected to socket server');
      socket!.emit('join-tenant', tenantId);
    });

    socket!.onDisconnect((_) {
      debugPrint('Disconnected from socket server');
    });

    socket!.onConnectError((err) {
      debugPrint('Socket connection error: $err');
    });
  }

  void on(String event, Function(dynamic) handler) {
    socket?.on(event, handler);
  }

  void off(String event) {
    socket?.off(event);
  }

  void disconnect() {
    socket?.disconnect();
    socket = null;
  }
}
