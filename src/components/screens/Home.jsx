import React, { useState, useEffect, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	Pressable,
	ActivityIndicator,
	SafeAreaView,
	StatusBar,
	Alert,
	LayoutAnimation
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { DateTime } from "luxon";
import { useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

function Home() {
	const [favorites, setFavorites] = useState([]);
	const [predictions, setPredictions] = useState({});
	const [isRefreshing, setIsRefreshing] = useState(false);
	const favoritesRef = useRef(favorites);

	// Update ref whenever favorites change
	useEffect(() => {
		favoritesRef.current = favorites;
	}, [favorites]);

	// Fetch favorites on page focus and fetch prediction for favorites
	useFocusEffect(
		React.useCallback(() => {
			loadFavorites().then(loadedFavorites => {
				if (loadedFavorites.length > 0) {
					fetchAllPredictions(loadedFavorites);
				}
			});
		}, [])
	);

	// Every minute fetchAllPredictions will run to prevent having to reload the page
	useEffect(() => {
		if (favorites.length > 0) {
			fetchAllPredictions(favorites);

			console.log("[Home] Periodic refresh triggered");
			const interval = setInterval(() => {
				console.log("[Home] Periodic refresh triggered");
				const currentFavorites = favoritesRef.current;
				if (currentFavorites.length > 0) {
					fetchAllPredictions(currentFavorites);
				}
			}, 60000);

			return () => clearInterval(interval);
		}
	}, [favorites]);

	const loadFavorites = async () => {
		try {
			const savedFavorites = await AsyncStorage.getItem("favorites");
			if (savedFavorites) {
				const parsedFavorites = JSON.parse(savedFavorites);
				const favoritesWithExpandedState = parsedFavorites.map(favorite => ({
					...favorite,
					isExpanded: favorite.isExpanded || false
				}));
				setFavorites(favoritesWithExpandedState);
				console.log(favorites)
				return favoritesWithExpandedState;
			}
			return [];
		} catch (error) {
			console.error("[Home] Error loading favorites:", error);
			return [];
		}
	};

	const toggleExpanded = async itemId => {
		try {
			// Animate layout changes (expanding/collapsing)
			LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

			// Create a new array with the updated favorite
			const updatedFavorites = favorites.map(favorite => {
				if (favorite.id === itemId) {
					return {
						...favorite,
						isExpanded: !favorite.isExpanded
					};
				}
				return favorite;
			});

			// Update state
			setFavorites(updatedFavorites);

			// Save to AsyncStorage
			await AsyncStorage.setItem("favorites", JSON.stringify(updatedFavorites));
		} catch (error) {
			console.error("Error toggling expanded state:", error);
		}
	};

	const removeFavorite = async item => {
		Alert.alert(
			"Remove Favorite",
			`Are you sure you want to remove ${item.name} from your favorites?`,
			[
				{
					text: "Cancel",
					style: "cancel"
				},
				{
					text: "Remove",
					style: "destructive",
					onPress: async () => {
						try {
							// Update AsyncStorage
							const tempFavs = favorites.filter(fav => !(fav.id === item.id));
							await AsyncStorage.setItem("favorites", JSON.stringify(tempFavs));

							// Update state
							setFavorites(tempFavs);

							console.log(
								`[Home] Removed favorite: ${item.name} (${item.type})`
							);
						} catch (error) {
							console.error("Error removing favorite:", error);
						}
					}
				}
			]
		);
	};

	const fetchAllPredictions = async (favoritesToUse = favorites) => {
		setIsRefreshing(true);
		console.log("[DEBUG] favoritesToUse:", favoritesToUse);
		console.log("[DEBUG] typeof favoritesToUse:", typeof favoritesToUse);
		console.log("[DEBUG] Array.isArray(favoritesToUse):", Array.isArray(favoritesToUse));
		console.log(`[Home] Starting fetch for ${favoritesToUse.length} favorites`);
		try {
			const predictionPromises = favoritesToUse.map(favorite => {
				if (favorite.type === "train") {
					return fetchTrainPredictions(favorite.stopId);
				} else {
					return fetchBusPredictions(favorite.routeNumber, favorite.stopIds);
				}
			});

			const results = await Promise.all(predictionPromises);

			const newPredictions = {};
			favoritesToUse.forEach((favorite, index) => {
				newPredictions[favorite.id] = results[index];
			});

			setPredictions(newPredictions);
			console.log(
				`[Home] Successfully fetched predictions for ${favoritesToUse.length} favorites`
			);
		} catch (error) {
			console.error("[Home] Error fetching predictions:", error);
		} finally {
			setIsRefreshing(false);
			console.log("[Home] Finished fetchAllPredictions");
		}
	};

	const fetchTrainPredictions = async stopIds => {
		try {
			const predictionPromises = stopIds.map(async stopId => {
				const response = await axios.get(
					`https://lapi.transitchicago.com/api/1.0/ttarrivals.aspx?key=${process.env.EXPO_PUBLIC_CTA_TRAIN_API_KEY}&stpid=${stopId}&outputType=JSON`
				);

				const predictions = response.data.ctatt?.eta || [];
				console.log(
					`[Home] Fetched ${predictions.length} train predictions for stop ${stopId}`
				);

				const groupedPredictions =
					predictions.length > 0
						? predictions.reduce((acc, prediction) => {
								const direction = prediction.stpDe;
								if (!acc[direction]) {
									acc[direction] = [];
								}
								acc[direction].push({
									arrivalTime: prediction.arrT,
									destination: prediction.destNm,
									runNumber: prediction.rn,
									isDelayed: prediction.isDly === "1",
									isApproaching: prediction.isApp === "1",
									isScheduled: prediction.isSch === "1",
									route: prediction.rt,
									stopName: prediction.staNm,
									stopDescription: prediction.stpDe
								});
								return acc;
						  }, {})
						: {};

				return {
					stopId,
					predictions: groupedPredictions
				};
			});

			const results = await Promise.all(predictionPromises);
			return results;
		} catch (error) {
			console.error("[Home] Error fetching train predictions:", error);
			return [];
		}
	};

	const fetchBusPredictions = async (routeNumber, stopIds) => {
		try {
			const predictionPromises = Object.entries(stopIds).map(
				async ([direction, stopId]) => {
					const response = await axios.get(
						`http://www.ctabustracker.com/bustime/api/v2/getpredictions?key=${process.env.EXPO_PUBLIC_CTA_BUS_API_KEY}&rt=${routeNumber}&stpid=${stopId}&format=json`
					);

					const predictions = response.data["bustime-response"].prd || [];
					console.log(
						`[Home] Fetched ${predictions.length} bus predictions for route ${routeNumber} at stop ${stopId}`
					);

					return {
						direction,
						predictions: predictions.filter(pred => pred.rtdir === direction)
					};
				}
			);

			const results = await Promise.all(predictionPromises);

			const directionPredictions = {};
			results.forEach(result => {
				directionPredictions[result.direction] = result.predictions;
			});

			return directionPredictions;
		} catch (error) {
			console.error("[Home] Error fetching bus predictions:", error);
			return {};
		}
	};

	const renderPredictions = item => {
		const itemPredictions = predictions[item.id] || {};
		if (item.type === "train") {
			return renderTrainPredictions(itemPredictions);
		} else {
			return renderBusPredictions(itemPredictions);
		}
	};

	const renderTrainPredictions = trainPredictions => {
		// Check for predictions if we have them
		if (!trainPredictions.length)
			return (
				<View style={styles.predictionsContainer}>
					<Text style={styles.noPredictions}>No predictions available</Text>
				</View>
			);

		return (
			<View style={styles.predictionsContainer}>
				{trainPredictions.map((stopPredictions, stopIndex) => {
					if (!stopPredictions || !stopPredictions.predictions) {
						return null;
					}

					return (
						<View
							key={stopIndex}
							style={[
								styles.stopPredictionsContainer,
								stopIndex === trainPredictions.length - 1 && {
									marginBottom: 0,
									borderBottomWidth: 0
								} //removes margin if it is last row
							]}
						>
							{Object.entries(stopPredictions.predictions).map(
								([direction, predictions], dirIndex, dirArray) => {
									if (!Array.isArray(predictions)) {
										return null;
									}

									return (
										<View
											key={`${direction}-${dirIndex}`}
											style={[
												styles.directionContainer,
												dirIndex === dirArray.length - 1 && { marginBottom: 0 }
											]}
										>
											<Text style={styles.directionHeader}>{direction}</Text>
											<View style={styles.tableHeader}>
												<Text style={[styles.tableHeaderCell, { flex: 1 }]}>
													Run
												</Text>
												<Text style={[styles.tableHeaderCell, { flex: 2 }]}>
													To
												</Text>
												<Text
													style={[
														styles.tableHeaderCell,
														{ flex: 1, textAlign: "right" }
													]}
												>
													ETA
												</Text>
											</View>
											{predictions.map((prediction, index) => {
												const currentTime =
													DateTime.now().setZone("America/Chicago");
												const arrivalTime = DateTime.fromISO(
													prediction.arrivalTime,
													{
														zone: "America/Chicago"
													}
												);

												const timeDiff = Math.round(
													arrivalTime.diff(currentTime, "minutes").minutes
												);

												const isDue = prediction.isApproaching || timeDiff <= 2;

												return (
													<View
														key={index}
														style={[
															styles.tableRow,
															index === predictions.length - 1 && {
																borderBottomWidth: 0
															}
														]}
													>
														<Text style={[styles.tableCell, { flex: 1 }]}>
															{prediction.runNumber}
														</Text>
														<Text style={[styles.tableCell, { flex: 2 }]}>
															{prediction.destination}
														</Text>
														<View style={[styles.etaContainer]}>
															<Text
																style={[
																	styles.etaText,
																	prediction.isDelayed && styles.delayedText,
																	isDue && styles.dueText,
																	prediction.isScheduled && styles.scheduledText
																]}
															>
																{isDue ? "DUE" : `${timeDiff} min`}
															</Text>
														</View>
													</View>
												);
											})}
										</View>
									);
								}
							)}
						</View>
					);
				})}
			</View>
		);
	};

	const renderBusPredictions = busPredictions => {
		const hasData = Object.values(busPredictions).some(
			predictions => Array.isArray(predictions) && predictions.length > 0
		);
		if (!hasData) {
			return (
				<View style={styles.predictionsContainer}>
					<Text style={styles.noPredictions}>No predictions available</Text>
				</View>
			);
		}

		return (
			<View style={styles.predictionsContainer}>
				{Object.entries(busPredictions).map(
					([direction, predictions], index, array) => (
						<View
							key={direction}
							style={[
								styles.directionContainer,
								index === array.length - 1 && { marginBottom: 0 }
							]}
						>
							<Text style={styles.directionHeader}>{direction}</Text>
							<View>
								<View style={styles.tableHeader}>
									<Text style={[styles.tableHeaderCell, { flex: 1 }]}>Bus</Text>
									<Text style={[styles.tableHeaderCell, { flex: 2 }]}>To</Text>
									<Text
										style={[
											styles.tableHeaderCell,
											{ flex: 1, textAlign: "right" }
										]}
									>
										ETA
									</Text>
								</View>
								{predictions.map((prediction, index) => {
									const isDelayed =
										prediction.dly === "1" || prediction.dly === true;
									let etaText;
									if (prediction.prdctdn === "DUE") {
										etaText = "DUE";
									} else if (prediction.prdctdn === "DLY") {
										etaText = "DELAYED";
									} else {
										const minutes = parseInt(prediction.prdctdn);
										if (isNaN(minutes)) {
											etaText = "N/A";
										} else if (minutes <= 2) {
											etaText = "DUE";
										} else {
											etaText = `${minutes} min`;
										}
									}

									return (
										<View
											key={index}
											style={[
												styles.tableRow,
												index === predictions.length - 1 && {
													borderBottomWidth: 0
												}
											]}
										>
											<Text style={[styles.tableCell, { flex: 1 }]}>
												{prediction.vid}
											</Text>
											<Text style={[styles.tableCell, { flex: 2 }]}>
												{prediction.des}
											</Text>
											<View style={[styles.etaContainer]}>
												<Text
													style={[
														styles.etaText,
														isDelayed && styles.delayedText,
														etaText === "DUE" && styles.dueText
													]}
												>
													{etaText}
												</Text>
											</View>
										</View>
									);
								})}
							</View>
						</View>
					)
				)}
			</View>
		);
	};

	const renderFavorite = ({ item }) => (
		// Render each favorite item with its predictions
		<Pressable
			onPress={() => toggleExpanded(item.id)}
			style={({ pressed }) => [
				styles.favoriteCard,
				{ borderLeftColor: item.color },
				pressed && { opacity: 0.7 }
			]}
		>
			<View style={styles.favoriteInfo}>
				<View style={styles.favoriteHeader}>
					<View style={styles.favoriteMainContent}>
						<Text style={styles.favoriteName}>{item.displayName}</Text>
						<View style={styles.typeContainer}>
							<Icon
								name={item.type === "train" ? "train" : "bus"}
								size={14}
								color="#666"
								style={styles.typeIcon}
							/>
							<Text style={styles.favoriteType}>
								{item.type === "train"
									? "Train Station"
									: `Route ${item.routeNumber} Bus Stop`}
							</Text>
						</View>
					</View>
					<View style={styles.iconContainer}>
						<Pressable
							onPress={() => removeFavorite(item)}
							style={styles.removeButton}
						>
							<Ionicons name="heart" size={24} color="#FF3B30" />
						</Pressable>
						<Ionicons
							name={item.isExpanded ? "chevron-up" : "chevron-down"}
							size={16}
							color="#666"
							style={styles.expandIcon}
						/>
					</View>
				</View>
				{item.isExpanded && renderPredictions(item)}
			</View>
		</Pressable>
	);

	const renderEmptyState = () => (
		<View style={styles.emptyStateContainer}>
			<Ionicons name="heart-outline" size={64} color="#CCCCCC" />
			<Text style={styles.noFavorites}>No favorites added yet</Text>
			<Text style={styles.emptyStateSubtitle}>
				Add your favorite train stations and bus stops to see their arrival
				times here
			</Text>
		</View>
	);

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
			<View style={styles.container}>
				<View style={styles.header}>
					<Text style={styles.title}>My Favorites</Text>
					<Pressable
						onPress={() => fetchAllPredictions()}
						style={styles.refreshButton}
						disabled={isRefreshing}
					>
						{isRefreshing ? (
							<ActivityIndicator size="small" color="#007AFF" />
						) : (
							<Ionicons name="refresh" size={24} color="#007AFF" />
						)}
					</Pressable>
				</View>

				<FlatList
					data={favorites}
					renderItem={renderFavorite}
					keyExtractor={item => `${item.type}-${item.id}`}
					style={styles.list}
					contentContainerStyle={styles.listContent}
					ListEmptyComponent={renderEmptyState}
					showsVerticalScrollIndicator={false}
				/>
			</View>
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
	refreshButton: {
		padding: 6,
		borderRadius: 20,
		backgroundColor: "#F0F8FF",
		width: 36,
		height: 36,
		alignItems: "center",
		justifyContent: "center"
	},
	list: {
		flex: 1,
		width: "100%"
	},
	listContent: {
		paddingVertical: 12,
		paddingBottom: 24
	},
	favoriteCard: {
		flexDirection: "row",
		alignItems: "stretch",
		backgroundColor: "#FFFFFF",
		borderRadius: 8,
		marginBottom: 8,
		borderLeftWidth: 6,
		shadowColor: "#000000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3
	},
	colorIndicator: {
		width: 6,
		height: "100%"
	},
	favoriteInfo: {
		flex: 1,
		padding: 12
	},
	favoriteHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 2
	},
	favoriteMainContent: {
		flex: 1,
		paddingRight: 8
	},
	favoriteName: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333333",
		flexWrap: "wrap"
	},
	typeContainer: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 2
	},
	typeIcon: {
		marginRight: 4
	},
	favoriteType: {
		fontSize: 14,
		color: "#666666"
	},
	iconContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8
	},
	removeButton: {
		padding: 6,
		width: 36,
		height: 36,
		alignItems: "center",
		justifyContent: "center"
	},
	predictionsContainer: {
		marginTop: 6,
		backgroundColor: "#F9F9F9",
		borderRadius: 8,
		padding: 10
	},
	tableHeader: {
		flexDirection: "row",
		paddingBottom: 6,
		marginBottom: 2
	},
	tableHeaderCell: {
		fontSize: 13,
		fontWeight: "600",
		color: "#666666",
		textTransform: "uppercase",
		textAlign: "left"
	},
	tableRow: {
		flexDirection: "row",
		paddingVertical: 6,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "#EEEEEE"
	},
	tableCell: {
		fontSize: 15,
		color: "#333333",
		textAlign: "left"
	},
	etaContainer: {
		flexDirection: "row",
		justifyContent: "flex-end",
		flex: 1
	},
	etaText: {
		fontSize: 15,
		fontWeight: "bold",
		color: "#666666",
		textAlign: "right"
	},
	delayedText: {
		color: "#FF3B30"
	},
	dueText: {
		color: "#34C759"
	},
	scheduledText: {
		fontWeight: "normal"
	},
	noPredictions: {
		fontSize: 15,
		color: "#999999",
		textAlign: "center",
		paddingVertical: 6
	},
	emptyStateContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingTop: 48
	},
	noFavorites: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#666666",
		marginTop: 12,
		marginBottom: 6
	},
	emptyStateSubtitle: {
		fontSize: 14,
		color: "#999999",
		textAlign: "center",
		paddingHorizontal: 24
	},
	directionContainer: {
		marginBottom: 8
	},
	directionHeader: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#333333",
		marginBottom: 6
	},
	stopPredictionsContainer: {
		marginBottom: 8,
		borderBottomWidth: 1,
		borderBottomColor: "#EEEEEE"
	},
	expandIcon: {
		marginLeft: 4
	}
});

export default Home;