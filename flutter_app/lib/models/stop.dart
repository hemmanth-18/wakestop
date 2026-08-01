class BusStop {
  final String id;
  final String name;
  final double lat;
  final double lng;
  final String district;

  BusStop({
    required this.id,
    required this.name,
    required this.lat,
    required this.lng,
    this.district = '',
  });

  factory BusStop.fromJson(Map<String, dynamic> json) {
    return BusStop(
      id: json['id'] ?? json['name'] ?? '',
      name: json['name'] ?? '',
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      district: json['district'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'lat': lat,
        'lng': lng,
        'district': district,
      };
}
