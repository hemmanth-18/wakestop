import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/api_constants.dart';
import '../models/trip.dart';

class ApiService {
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  static Future<void> setToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }

  static Future<void> removeToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
  }

  static Future<List<dynamic>> searchStops(String query) async {
    try {
      final res = await http.get(Uri.parse('${ApiConstants.stopsEndpoint}?q=${Uri.encodeComponent(query)}'));
      if (res.statusCode == 200) {
        return jsonDecode(res.body);
      }
    } catch (e) {}
    return [];
  }

  static Future<Trip> createTrip(Destination destination) async {
    try {
      final token = await getToken();
      final res = await http.post(
        Uri.parse(ApiConstants.tripsEndpoint),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'destination': destination.toJson()}),
      );
      if (res.statusCode == 200) {
        return Trip.fromJson(jsonDecode(res.body));
      }
    } catch (e) {}

    // Fallback local trip creation for 100% offline & instant start
    return Trip(
      id: 'local_${DateTime.now().millisecondsSinceEpoch}',
      userId: 'local_user',
      destination: destination,
      status: 'active',
      startTime: DateTime.now(),
    );
  }

  static Future<List<Trip>> getTripHistory() async {
    final token = await getToken();
    if (token == null) return [];
    try {
      final res = await http.get(
        Uri.parse('${ApiConstants.tripsEndpoint}/history'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (res.statusCode == 200) {
        final List list = jsonDecode(res.body);
        return list.map((e) => Trip.fromJson(e)).toList();
      }
    } catch (e) {}
    return [];
  }

  static Future<void> endTrip(String tripId, int? wakeResponseSec) async {
    final token = await getToken();
    try {
      await http.patch(
        Uri.parse('${ApiConstants.tripsEndpoint}/$tripId/end'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'wakeResponseSec': wakeResponseSec}),
      );
    } catch (e) {}
  }
}
