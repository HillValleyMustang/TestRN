import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";

interface RestTimerProps {
  visible: boolean;
  onClose: () => void;
  initialSeconds?: number;
}

export function RestTimer({
  visible,
  onClose,
  initialSeconds = 90,
}: RestTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (visible) {
      setSeconds(initialSeconds);
      setIsRunning(true);
    }
  }, [visible, initialSeconds]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((prev) => prev - 1);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, seconds]);

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const timeDisplay = `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;

  const presetTimes = [30, 60, 90, 120, 180];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Rest Timer</Text>

          <View style={styles.timerDisplay}>
            <Text style={[styles.timeText, seconds === 0 && styles.timeUpText]}>
              {seconds === 0 ? "Time's up!" : timeDisplay}
            </Text>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => setIsRunning(!isRunning)}
            >
              <Text style={styles.controlButtonText}>
                {isRunning ? "⏸ Pause" : "▶️ Resume"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => {
                setSeconds(initialSeconds);
                setIsRunning(true);
              }}
            >
              <Text style={styles.controlButtonText}>🔄 Reset</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.presets}>
            <Text style={styles.presetsLabel}>Quick Set:</Text>
            <View style={styles.presetsRow}>
              {presetTimes.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={styles.presetButton}
                  onPress={() => {
                    setSeconds(time);
                    setIsRunning(true);
                  }}
                >
                  <Text style={styles.presetButtonText}>{time}s</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#111",
    borderRadius: 20,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "#333",
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 24,
  },
  timerDisplay: {
    backgroundColor: "#000",
    borderRadius: 16,
    padding: 32,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#0a0",
  },
  timeText: {
    color: "#0a0",
    fontSize: 64,
    fontWeight: "bold",
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  timeUpText: {
    color: "#f00",
    fontSize: 32,
  },
  controls: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  controlButton: {
    flex: 1,
    backgroundColor: "#222",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  controlButtonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
  },
  presets: {
    marginBottom: 24,
  },
  presetsLabel: {
    color: "#888",
    fontSize: 14,
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: "row",
    gap: 8,
  },
  presetButton: {
    flex: 1,
    backgroundColor: "#222",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  presetButtonText: {
    color: "#0a0",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "600",
  },
  closeButton: {
    backgroundColor: "#0a0",
    padding: 16,
    borderRadius: 12,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
});
