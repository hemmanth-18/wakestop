import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import '../models/trip.dart';
import '../services/api_service.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<Trip> _trips = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  void _loadHistory() async {
    try {
      final trips = await ApiService.getTripHistory();
      setState(() => _trips = trips);
    } catch (e) {
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Trip History'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.neonCyan))
          : _trips.isEmpty
              ? const Center(
                  child: Text(
                    'No trips logged yet.',
                    style: TextStyle(color: AppTheme.night500, fontSize: 16),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _trips.length,
                  itemBuilder: (context, index) {
                    final trip = _trips[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      color: AppTheme.night900,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: const BorderSide(color: AppTheme.night700),
                      ),
                      child: ListTile(
                        leading: const Icon(Icons.location_on, color: AppTheme.neonGold),
                        title: Text(
                          trip.destination.name,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        subtitle: Text(
                          DateFormat('MMM dd, yyyy • hh:mm a').format(trip.startTime),
                          style: const TextStyle(color: AppTheme.night500, fontSize: 12),
                        ),
                        trailing: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: trip.status == 'completed'
                                ? AppTheme.neonEmerald.withOpacity(0.15)
                                : AppTheme.neonCyan.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            trip.status.toUpperCase(),
                            style: TextStyle(
                              color: trip.status == 'completed'
                                  ? AppTheme.neonEmerald
                                  : AppTheme.neonCyan,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
