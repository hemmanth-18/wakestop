class Destination {
  final String name;
  final double lat;
  final double lng;

  Destination({
    required this.name,
    required this.lat,
    required this.lng,
  });

  factory Destination.fromJson(Map<String, dynamic> json) {
    return Destination(
      name: json['name'] ?? '',
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'lat': lat,
        'lng': lng,
      };
}

class Trip {
  final String id;
  final String userId;
  final Destination destination;
  final String status;
  final DateTime startTime;
  final DateTime? endTime;

  Trip({
    required this.id,
    required this.userId,
    required this.destination,
    required this.status,
    required this.startTime,
    this.endTime,
  });

  factory Trip.fromJson(Map<String, dynamic> json) {
    return Trip(
      id: json['id'] ?? '',
      userId: json['userId'] ?? '',
      destination: Destination.fromJson(json['destination']),
      status: json['status'] ?? 'active',
      startTime: DateTime.parse(json['startTime']),
      endTime: json['endTime'] != null ? DateTime.parse(json['endTime']) : null,
    );
  }
}
