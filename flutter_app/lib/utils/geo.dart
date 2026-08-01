import 'dart:math';

double distanceMetres(double lat1, double lon1, double lat2, double lon2) {
  const R = 6371000.0;
  final phi1 = lat1 * pi / 180;
  final phi2 = lat2 * pi / 180;
  final deltaPhi = (lat2 - lat1) * pi / 180;
  final deltaLambda = (lon2 - lon1) * pi / 180;

  final a = sin(deltaPhi / 2) * sin(deltaPhi / 2) +
      cos(phi1) * cos(phi2) * sin(deltaLambda / 2) * sin(deltaLambda / 2);

  final c = 2 * atan2(sqrt(a), sqrt(1 - a));

  return R * c;
}

String formatDistance(double metres) {
  if (metres >= 1000) {
    return '${(metres / 1000).toStringAsFixed(1)} km';
  }
  return '${metres.round()} m';
}
