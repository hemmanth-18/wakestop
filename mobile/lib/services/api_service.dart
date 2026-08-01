import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/trip.dart';

class ApiService {
  // Update with your server IP (or http://10.0.2.2:4000 for Android emulator)
  static const String baseUrl = 'http://10.86.54.203:4000/api';

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  static Future<void> setToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }

  static Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    final data = jsonDecode(res.body);
    if (res.statusCode == 200) {
      await setToken(data['token']);
      return data;
    }
    throw Exception(data['error'] ?? 'Failed to login');
  }

  static Future<Map<String, dynamic>> register(String name, String email, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'name': name, 'email': email, 'password': password}),
    );
    final data = jsonDecode(res.body);
    if (res.statusCode == 200) {
      await setToken(data['token']);
      return data;
    }
    throw Exception(data['error'] ?? 'Failed to register');
  }

  static Future<List<dynamic>> searchStops(String query) async {
    final res = await http.get(Uri.parse('$baseUrl/stops?q=${Uri.encodeComponent(query)}'));
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    }
    return [];
  }

  static Future<Trip> createTrip(Destination destination) async {
    final token = await getToken();
    final res = await http.post(
      Uri.parse('$baseUrl/trips'),
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'destination': destination.toJson()}),
    );
    if (res.statusCode == 200) {
      return Trip.fromJson(jsonDecode(res.body));
    }
    throw Exception('Failed to start trip');
  }

  static Future<List<Trip>> getTripHistory() async {
    final token = await getToken();
    if (token == null) return [];
    final res = await http.get(
      Uri.parse('$baseUrl/trips/history'),
      headers: {'Authorization': 'Bearer $token'},
    );
    if (res.statusCode == 200) {
      final List list = jsonDecode(res.body);
      return list.map((e) => Trip.fromJson(e)).toList();
    }
    return [];
  }

  static Future<void> endTrip(String tripId, int? wakeResponseSec) async {
    final token = await getToken();
    await http.patch(
      Uri.parse('$baseUrl/trips/$tripId/end'),
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'wakeResponseSec': wakeResponseSec}),
    );
  }
}
