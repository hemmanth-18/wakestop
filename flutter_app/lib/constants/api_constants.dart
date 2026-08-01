class ApiConstants {
  // Production / Local Backend API Base URL
  static const String baseUrl = 'http://10.86.54.203:4000/api';

  static const String loginEndpoint = '$baseUrl/auth/login';
  static const String registerEndpoint = '$baseUrl/auth/register';
  static const String profileEndpoint = '$baseUrl/auth/me';
  static const String stopsEndpoint = '$baseUrl/stops';
  static const String tripsEndpoint = '$baseUrl/trips';
}
