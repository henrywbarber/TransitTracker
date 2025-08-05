import React, { useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	StatusBar,
	Switch,
	ScrollView
} from "react-native";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

function Settings() {
	/*const [notifications, setNotifications] = useState(false);

	const toggleNotifications = () => {
		setNotifications(prev => !prev);
	};*/

	const LegendItem = ({ icon, label, description, textColor = '#333' }) => (
		<View style={styles.legendItem}>
			<View style={styles.iconContainer}>
				{icon}
			</View>
			<View style={styles.textContainer}>
				<Text style={[styles.legendLabel, { color: textColor }]}>{label}</Text>
				<Text style={styles.legendDescription}>{description}</Text>
			</View>
		</View>
	);

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
			<ScrollView style={styles.container}>
				<View style={styles.header}>
					<Text style={styles.title}>Settings</Text>
				</View>

				{/* Notifications Section 
				<View style={styles.section}>
					<View style={styles.noti}>
						<Text style={styles.sectionTitle}>Notifications</Text>
						<Switch
							value={notifications}
							onValueChange={toggleNotifications}
							trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
							thumbColor={notifications ? '#FFFFFF' : '#FFFFFF'}
						/>
					</View>
				</View>
					*/}
				{/* Legend Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Legend</Text>
					<View style={styles.legendContainer}>
						<LegendItem
							icon={
								<MaterialCommunityIcons name="bus" size={24} color="#2196F3" />
							}
							label="Bus"
							description="Bus route"
						/>
						<LegendItem
							icon={
								<MaterialCommunityIcons
									name="train"
									size={24}
									color="#FF9800"
								/>
							}
							label="Train"
							description="Train route"
						/>
						<LegendItem
							icon={
								<Ionicons name="git-branch-outline" size={24} color="#9C27B0" />
							}
							label="Connection"
							description="Connecting stop"
						/>
						<LegendItem
							icon={<FontAwesome name="wheelchair" size={24} color="#4CAF50" />}
							label="Accessible"
							description="Handicap accessible"
						/>


						<LegendItem
							icon={<Text style={styles.etaText}>5 min</Text>}
							label="Live ETA"
							description="Estimated arrival time based on live data"
						/>
						<LegendItem
							icon={<Text style={styles.scheduledText}>5 min</Text>}
							label="Scheduled ETA"
							description="Arrival time based on scheduled data"
						/>


						<LegendItem
							icon={<Text style={styles.dueText}>DUE</Text>}
							label="Due"
							description="Arriving in less than 1 minute"
						/>
						<LegendItem
							icon={<Text style={styles.delayedText}>DLY</Text>}
							label="Delayed"
							description="Delayed arrival"
						/>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#F8F8F8"
	},
	container: {
		flex: 1,
		paddingHorizontal: 12
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		height: 56,
		borderBottomWidth: 1,
		borderBottomColor: "#EEEEEE"
	},
	title: {
		fontSize: 28,
		fontWeight: "bold",
		color: "#333333"
	},
	section: {
		marginTop: 24,
		backgroundColor: "#FFFFFF",
		borderRadius: 12,
		padding: 16,
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 1
		},
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2
	},
	noti: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center"
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#333333",
		marginBottom: 16
	},
	legendContainer: {
		gap: 16
	},
	legendItem: {
		flexDirection: "row",
		alignItems: "center"
	},
	iconContainer: {
		width: 40,
		alignItems: "center",
		marginRight: 16
	},
	textContainer: {
		flex: 1
	},
	legendLabel: {
		fontSize: 16,
		fontWeight: "500",
		marginBottom: 2
	},
	legendDescription: {
		fontSize: 14,
		color: "#666666"
	},
	etaText: {
		fontSize: 14,
		fontWeight: "bold",
		color: "#666666"
	},
	scheduledText: {
		fontSize: 14,
		fontWeight: "normal",
		color: "#666666"
	},
	delayedText: {
		fontSize: 14,
		fontWeight: "bold",
		color: "#FF3B30"
	},
	dueText: {
		fontSize: 14,
		fontWeight: "bold",
		color: "#34C759"
	}
});

export default Settings;