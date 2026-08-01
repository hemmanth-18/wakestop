import 'package:flutter/material.dart';

class AppTheme {
  static const Color night950 = Color(0xFF050811);
  static const Color night900 = Color(0xFF0A0F1D);
  static const Color night800 = Color(0xFF141C33);
  static const Color night700 = Color(0xFF222F52);
  static const Color night500 = Color(0xFF64748B);

  static const Color neonCyan = Color(0xFF00F0FF);
  static const Color neonGold = Color(0xFFFFB800);
  static const Color neonPurple = Color(0xFFB026FF);
  static const Color neonEmerald = Color(0xFF10B981);
  static const Color alertRed = Color(0xFFFF2E55);

  static ThemeData get darkTheme {
    return ThemeData.dark().copyWith(
      scaffoldBackgroundColor: night950,
      colorScheme: const ColorScheme.dark(
        primary: neonCyan,
        secondary: neonGold,
        surface: night900,
        background: night950,
        error: alertRed,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: night950,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: Colors.white,
          fontSize: 22,
          fontWeight: FontWeight.extrabold,
          letterSpacing: -0.5,
        ),
      ),
      cardTheme: CardTheme(
        color: night900.withOpacity(0.9),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0xFF222F52)),
        ),
      ),
    );
  }
}
