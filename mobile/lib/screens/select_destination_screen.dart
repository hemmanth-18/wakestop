import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../models/trip.dart';
import '../services/api_service.dart';
import 'tracking_screen.dart';

class SelectDestinationScreen extends StatefulWidget {
  const SelectDestinationScreen({super.key});

  @override
  State<SelectDestinationScreen> createState() => _SelectDestinationScreenState();
}

class _SelectDestinationScreenState extends State<SelectDestinationScreen> {
  final TextEditingController _searchController = TextEditingController();
  List<dynamic> _searchResults = [];
  Destination? _selectedDestination;
  bool _isSearching = false;
  bool _isStarting = false;

  void _onSearchChanged(String query) async {
    if (query.trim().isEmpty) {
      setState(() => _searchResults = []);
      return;
    }
    setState(() => _isSearching = true);
    try {
      final results = await ApiService.searchStops(query);
      setState(() => _searchResults = results);
    } catch (e) {
    } finally {
      setState(() => _isSearching = false);
    }
  }

  void _startTrip() async {
    if (_selectedDestination == null) return;
    setState(() => _isStarting = true);
    try {
      final trip = await ApiService.createTrip(_selectedDestination!);
      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => TrackingScreen(trip: trip),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to start trip: $e')),
      );
    } finally {
      if (mounted) setState(() => _isStarting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Select Destination'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Search Input
            TextField(
              controller: _searchController,
              onChanged: _onSearchChanged,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Search bus stop e.g. Salem, Chennai',
                hintStyle: const TextStyle(color: AppTheme.night500),
                prefixIcon: const Icon(Icons.search, color: AppTheme.neonCyan),
                filled: true,
                fillColor: AppTheme.night900,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: AppTheme.night700),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: AppTheme.neonGold),
                ),
              ),
            ),
            const SizedBox(height: 16),

            if (_isSearching)
              const Center(child: CircularProgressIndicator(color: AppTheme.neonCyan))
            else
              Expanded(
                child: ListView.builder(
                  itemCount: _searchResults.length,
                  itemBuilder: (context, index) {
                    final stop = _searchResults[index];
                    final isSelected = _selectedDestination?.name == stop['name'];
                    return Card(
                      color: isSelected ? AppTheme.neonGold.withOpacity(0.15) : AppTheme.night900,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                        side: BorderSide(
                          color: isSelected ? AppTheme.neonGold : AppTheme.night700,
                        ),
                      ),
                      child: ListTile(
                        onTap: () {
                          setState(() {
                            _selectedDestination = Destination(
                              name: stop['name'],
                              lat: (stop['lat'] as num).toDouble(),
                              lng: (stop['lng'] as num).toDouble(),
                            );
                          });
                        },
                        leading: Icon(
                          Icons.location_on,
                          color: isSelected ? AppTheme.neonGold : AppTheme.neonCyan,
                        ),
                        title: Text(
                          stop['name'] ?? '',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        trailing: isSelected
                            ? const Icon(Icons.check_circle, color: AppTheme.neonGold)
                            : null,
                      ),
                    );
                  },
                ),
              ),

            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: _selectedDestination != null && !_isStarting ? _startTrip : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.neonGold,
                  disabledBackgroundColor: AppTheme.night700,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: _isStarting
                    ? const CircularProgressIndicator(color: AppTheme.night950)
                    : Text(
                        _selectedDestination != null
                            ? 'Activate Alarm for ${_selectedDestination!.name}'
                            : 'Select a location to continue',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.night950,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
