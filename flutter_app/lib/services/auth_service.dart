import 'dart:convert';
import 'package:http/http.dart' as http;
import '../constants/api_constants.dart';
import '../models/user.dart';
import 'api_service.dart';

class AuthService {
  static Future<User> login(String email, String password) async {
    final res = await http.post(
      Uri.parse(ApiConstants.loginEndpoint),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    final data = jsonDecode(res.body);
    if (res.statusCode == 200) {
      await ApiService.setToken(data['token']);
      return User.fromJson(data['user']);
    }
    throw Exception(data['error'] ?? 'Invalid credentials');
  }

  static Future<User> register(String name, String email, String password) async {
    final res = await http.post(
      Uri.parse(ApiConstants.registerEndpoint),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'name': name, 'email': email, 'password': password}),
    );
    final data = jsonDecode(res.body);
    if (res.statusCode == 200) {
      await ApiService.setToken(data['token']);
      return User.fromJson(data['user']);
    }
    throw Exception(data['error'] ?? 'Registration failed');
  }

  static Future<User?> getCurrentUser() async {
    final token = await ApiService.getToken();
    if (token == null) return null;
    try {
      final res = await http.get(
        Uri.parse(ApiConstants.profileEndpoint),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        return User.fromJson(data['user']);
      }
    } catch (e) {}
    return null;
  }

  static Future<void> logout() async {
    await ApiService.removeToken();
  }
}
