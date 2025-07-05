import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
	View,
	Text,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	ActivityIndicator,
	SectionList,
	SafeAreaView,
	StatusBar,
	Alert
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const SectionHeader = React.memo(({ section, onToggle }) => (
	<TouchableOpacity
		onPress={() => onToggle(section.routeNum)}
		activeOpacity={0.7}
		style={[
			styles.sectionCard,
			{ borderLeftColor: section.routeClr }
		]}
	>
		<Text style={styles.sectionTitle}>
			{section.routeNum} - {section.routeName}
		</Text>
		<Ionicons
			name={section.dropdownOn ? "chevron-up" : "chevron-down"}
			size={24}
			color="#666"
		/>
	</TouchableOpacity>
));

function Busses() {
	const [search, setSearch] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [allRoutes, setAllRoutes] = useState([]);
	const [favorites, setFavorites] = useState([]);

	const processRouteData = async (routes) => {
		return Promise.all(
			routes.map(async route => {
				const directionResponse = await axios.get(
					`http://www.ctabustracker.com/bustime/api/v2/getdirections?key=${process.env.EXPO_PUBLIC_CTA_BUS_API_KEY}&rt=${route.routeNum}&format=json`
				);

				const directions = directionResponse.data[
					"bustime-response"
				].directions.map(dir => dir.dir);
				route.directions = directions;

				await Promise.all(
					directions.map(async direction => {
						const stopsResponse = await axios.get(
							`http://www.ctabustracker.com/bustime/api/v2/getstops?key=${process.env.EXPO_PUBLIC_CTA_BUS_API_KEY}&rt=${route.routeNum}&dir=${direction}&format=json`
						);

						stopsResponse.data["bustime-response"].stops.forEach(stop => {
							const stopName = stop.stpnm;
							const stopId = stop.stpid;

							if (!route.stops[stopName]) {
								route.stops[stopName] = {
									directions: {},
									dropdownOn: false
								};
							}

							route.stops[stopName].directions[direction] = {
								stopId: stopId,
								predictions: []
							};
						});
					})
				);

				return route;
			})
		);
	};

	useEffect(() => {
		const fetchRoutes = async () => {
			console.log("[Busses] Fetching all routes")
			try {
				const routesResponse = await axios.get(
					`http://www.ctabustracker.com/bustime/api/v2/getroutes?key=${process.env.EXPO_PUBLIC_CTA_BUS_API_KEY}&format=json`
				);

				const routesData = routesResponse.data["bustime-response"].routes.map(
					route => ({
						routeName: route.rtnm,
						routeNum: route.rt,
						routeClr: route.rtclr,
						dropdownOn: false,
						directions: [],
						stops: {}
					})
				);

				console.log(`[Busses] Processing ${routesData.length} routes`);
				
				// Process all routes at once
				const processedRoutes = await processRouteData(routesData);
				setAllRoutes(processedRoutes);

			} catch (error) {
				console.error("Error fetching bus route data:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchRoutes();
		
	}, []);

	useFocusEffect(
		useCallback(() => {
			const loadFavorites = async () => {
				try {
					const savedFavorites = await AsyncStorage.getItem('favorites');
					if (savedFavorites) {
						const tempFavs = JSON.parse(savedFavorites);
						// Ensure each favorite has an isExpanded property
						const favoritesWithExpandedState = tempFavs.map(favorite => ({
							...favorite,
							isExpanded: favorite.isExpanded || false
						}));
						const busFavs = favoritesWithExpandedState.filter(f => f.type === 'bus');
						setFavorites(busFavs);
					}
				} catch (error) {
					console.error('Error loading favorites:', error);
				}
			};

			loadFavorites();
		}, [])
	);

	const fetchStopPredictions = async (stopId, routeNum, direction) => {
		try {
			console.log(`[Busses] Fetched predictions for ${stopId}`)
			const response = await axios.get(
				`http://www.ctabustracker.com/bustime/api/v2/getpredictions?key=${process.env.EXPO_PUBLIC_CTA_BUS_API_KEY}&rt=${routeNum}&stpid=${stopId}&format=json`
			);

			const predictions = response.data["bustime-response"].prd
				? response.data["bustime-response"].prd
				: [];

			const filteredPredictions = predictions.filter(
				prediction => prediction.rtdir === direction
			);

			setAllRoutes(prevRoutes =>
				prevRoutes.map(route => {
					if (route.routeNum === routeNum) {
						const stopName = Object.keys(route.stops).find(name =>
							Object.keys(route.stops[name].directions).some(
								dir => route.stops[name].directions[dir].stopId === stopId
							)
						);

						if (stopName) {
							return {
								...route,
								stops: {
									...route.stops,
									[stopName]: {
										...route.stops[stopName],
										directions: {
											...route.stops[stopName].directions,
											[direction]: {
												...route.stops[stopName].directions[direction],
												predictions: filteredPredictions
											}
										}
									}
								}
							};
						}
					}
					return route;
				})
			);
		} catch (error) {
			console.error(
				`Error fetching predictions for stopId ${stopId} routeNum ${routeNum} direction ${direction}:`,
				error
			);
		}
	};

	const fetchAllPredictions = async () => {
		console.log("[Busses] Fetching predictions for expanded stops only");
		setIsRefreshing(true);

		try {
			// Fetch predictions for stopId's with dropdownOn in parallel
			const promises = [];

			for (const route of allRoutes) {
				for (const [stopName, stopData] of Object.entries(route.stops)) {
					if (stopData.dropdownOn) {
						for (const [direction, dirData] of Object.entries(
							stopData.directions
						)) {
							promises.push(
								fetchStopPredictions(dirData.stopId, route.routeNum, direction)
							);
						}
					}
				}
			}

			await Promise.all(promises);
		} catch (error) {
			console.error("[Busses] Error during fetchAllPredictions:", error);
		} finally {
			setIsRefreshing(false);
			console.log("[Busses] Done fetching expanded predictions");
		}
	};
	
	

	const filterStops = useCallback(
		route => {
			if (!search) return Object.keys(route.stops);
			const searchLower = search.toLowerCase();
			return Object.keys(route.stops).filter(stopName =>
				stopName.toLowerCase().includes(searchLower)
			);
		},
		[search]
	);

	const sections = useMemo(() => {
		const searchLower = search.toLowerCase();

		return allRoutes
			.map((route, index) => {
				const routeNameMatches = route.routeName
					.toLowerCase()
					.includes(searchLower);
				const stopMatches = Object.keys(route.stops).filter(stopName =>
					stopName.toLowerCase().includes(searchLower)
				);

				// Decide which stops to include
				const data = routeNameMatches
					? Object.keys(route.stops) // full list of stops
					: stopMatches; // filtered stop list

				// If route name or any stop matches, include this section
				if (routeNameMatches || stopMatches.length > 0) {
					return {
						...route,
						data: route.dropdownOn ? data : [],
						key: `${route.routeNum}-${index}`,
						sectionIndex: index
					};
				}

				return null; // exclude this route
			})
			.filter(Boolean); // remove nulls
	}, [allRoutes, search]);
	

	const isFavorite = (routeNum, stopName) => {
		const favoriteId = `${routeNum}-${stopName}`;
		return favorites.some(fav => fav.id === favoriteId && fav.type === 'bus');
	};

	const toggleFavorite = async (stopName, stopId, route) => {
		try {
			console.log("[Busses] toggling favorite for " + stopName)

			const dirWithStops = Object.fromEntries(
				Object.entries(route.stops[stopName].directions).map(
				  ([direction, data]) => [direction, data.stopId]
				)
			);
			const favoriteItem = {
				id: `${route.routeNum}-${stopName}`, 
				name: `${route.routeName} - ${stopName}`,
				type: 'bus',
				color: route.routeClr,
				stopIds: dirWithStops,
				routeNumber: route.routeNum,
				isExpanded: false
			};

			// Get current favorites
			const savedFavorites = await AsyncStorage.getItem('favorites');
			let tempFavs = savedFavorites ? JSON.parse(savedFavorites) : [];

			// Check if already favorited
			const isFavorited = favorites.some(
				fav => fav.id === favoriteItem.id && fav.type === 'bus'
			);

			if (isFavorited) {
				// Remove from favorites
				Alert.alert(
					"Remove Favorite",
					`Are you sure you want to remove ${stopName} from your favorites?`,
					[
						{
							text: "Cancel",
							style: "cancel"
						},
						{
							text: "Remove",
							sytle: "destructive",
							onPress: async () => {
								tempFavs = tempFavs.filter(
									fav => !(fav.id === favoriteItem.id && fav.type === "bus")
								);
								// Save updated favorites
								await AsyncStorage.setItem(
									"favorites",
									JSON.stringify(tempFavs)
								);
								setFavorites(tempFavs);
							}
						}
					]
				)	
			} else {
				// Add to favorites
				tempFavs.push(favoriteItem);
				// Save updated favorites
				await AsyncStorage.setItem("favorites", JSON.stringify(tempFavs));
				setFavorites(tempFavs);
			}
		} catch (error) {
			console.error('Error toggling favorite:', error);
		}
	};

	const toggleRouteDropdown = useCallback(routeNum => {
		setAllRoutes(prevRoutes =>
			prevRoutes.map(route =>
				route.routeNum === routeNum
					? { ...route, dropdownOn: !route.dropdownOn }
					: route
			)
		);
	}, []);

	const toggleStopDropdown = useCallback((stopName, routeNum) => {
		setAllRoutes(prevRoutes =>
			prevRoutes.map(route => {
				
				if (route.routeNum === routeNum) {
					const isExpanding = !route.stops[stopName].dropdownOn;
					
					if (isExpanding) {
						Object.entries(route.stops[stopName].directions).forEach(
							([direction, data]) => {
								console.log(data)
								fetchStopPredictions(data.stopId, routeNum, direction);
							}
						);
					}

					return {
						...route,
						stops: {
							...route.stops,
							[stopName]: {
								...route.stops[stopName],
								dropdownOn: isExpanding
							}
						}
					};
				}
				return route;
			})
		);
	}, []);

	const renderSectionHeader = useCallback(
		({ section }) => (
			<SectionHeader 
				section={section} 
				onToggle={toggleRouteDropdown}
				key={`header-${section.key}`} // Ensure unique key for header
			/>
		),
		[toggleRouteDropdown]
	);

	const renderItem = useCallback(
		({ item, section, index }) => (
			<TouchableOpacity
				onPress={() => toggleStopDropdown(item, section.routeNum)}
				activeOpacity={0.7}
				key={`${section.key}-${item}-${index}`} // Unique key for each item
			>
				<View style={styles.stopCard}>
					<View
						style={[
							styles.stopColorIndicator,
							{ backgroundColor: section.routeClr }
						]}
					/>
					<View style={styles.stopInfo}>
						<View style={styles.stopHeader}>
							<Text style={styles.stopName}>{item}</Text>
							<View style={styles.iconContainer}>
								<TouchableOpacity
									onPress={() =>
										toggleFavorite(
											item, // stopName
											section.stops[item].directions[
												Object.keys(section.stops[item].directions)[0]
											].stopId, // stopId
											section // route info
										)
									}
									style={styles.favoriteButton}
								>
									<Ionicons
										name={
											isFavorite(section.routeNum, item)
												? "heart"
												: "heart-outline"
										}
										size={24}
										color={isFavorite(section.routeNum, item) ? "red" : "#666"}
									/>
								</TouchableOpacity>
								<Ionicons
									name={
										section.stops[item].dropdownOn
											? "chevron-up"
											: "chevron-down"
									}
									size={16}
									color="#666"
									style={styles.expandIcon}
								/>
							</View>
						</View>
						{section.stops[item].dropdownOn && (
							<View style={styles.predictionsContainer}>
								{Object.entries(section.stops[item].directions).map(
									([direction, data], index, array) => {
										const { stopId, predictions } = data;
										return (
											<View
												key={direction}
												style={[
													styles.directionContainer,
													index === array.length - 1 && { marginBottom: 0 }
												]}
											>
												<Text style={styles.directionHeader}>{direction}</Text>
												{predictions.length > 0 ? (
													<>
														<View style={styles.tableHeader}>
															<Text
																style={[styles.tableHeaderCell, { flex: 1 }]}
															>
																Bus
															</Text>
															<Text
																style={[styles.tableHeaderCell, { flex: 2 }]}
															>
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
															const isDelayed = prediction.dly === "1" || prediction.dly === true;
															
															// Fix the ETA text logic
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
																				etaText === "DUE" && styles.dueText,
																				etaText === "DELAYED" && styles.delayedText
																			]}
																		>
																			{etaText}
																		</Text>
																	</View>
																</View>
															);
														})}
													</>
												) : (
													<Text style={styles.noPredictions}>
														No predictions available
													</Text>
												)}
											</View>
										);
									}
								)}
							</View>
						)}
					</View>
				</View>
			</TouchableOpacity>
		),
		[toggleStopDropdown, toggleFavorite, isFavorite]
	);

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
			<View style={styles.container}>
				<View style={styles.header}>
					<Text style={styles.headerTitle}>Chicago Bus Routes</Text>
					<TouchableOpacity
						onPress={fetchAllPredictions}
						style={styles.refreshButton}
						disabled={isRefreshing}
					>
						{isRefreshing ? (
							<ActivityIndicator size="small" color="#007AFF" />
						) : (
							<Ionicons name="refresh" size={24} color="#007AFF" />
						)}
					</TouchableOpacity>
				</View>
				{isLoading ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color="#007AFF" />
						<Text style={styles.loadingText}>Loading All Bus Routes...</Text>
					</View>
				) : (
					<>
						<View style={styles.searchContainer}>
							<Ionicons
								name="search"
								size={20}
								color="#999"
								style={styles.searchIcon}
							/>
							<TextInput
								style={styles.searchBar}
								placeholder="Search by Stop Name"
								value={search}
								onChangeText={setSearch}
								clearButtonMode="always"
								autoComplete=""
							/>
						</View>
						{search.length > 0 &&
						allRoutes.flatMap(route => filterStops(route)).length < 1 ? (
							<Text style={styles.noMatch}>No Matching Stops</Text>
						) : (
							<SectionList
								sections={sections}
								keyExtractor={(item, index, section) => {
									const sectionKey = section?.key || `section-${index}`;
									return `${sectionKey}-${item}-${index}`;
								}}
								renderSectionHeader={renderSectionHeader}
								renderItem={renderItem}
							/>
						)}
					</>
				)}
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#f4f4f4"
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
	headerTitle: {
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
	routeCounter: {
		fontSize: 14,
		color: "#666",
		marginTop: 4
	},
	searchContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#fff",
		borderRadius: 8,
		paddingHorizontal: 12,
		marginTop: 12,
		marginBottom: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3
	},
	searchIcon: {
		marginRight: 8
	},
	searchBar: {
		flex: 1,
		height: 40,
		fontSize: 16
	},
	noMatch: {
		textAlign: "center",
		fontSize: 16,
		padding: 15
	},
	sectionCard: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		backgroundColor: "#fff",
		padding: 12,
		borderRadius: 8,
		marginBottom: 8,
		borderLeftWidth: 6,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333"
	},
	stopCard: {
		flexDirection: "row",
		alignItems: "stretch",
		backgroundColor: "#FFFFFF",
		borderRadius: 8,
		marginBottom: 8,
		padding: 8,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2
	},
	stopColorIndicator: {
		width: 4,
		height: "100%",
		borderRadius: 4,
		marginRight: 12
	},
	stopInfo: {
		flex: 1
	},
	stationHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 2
	},
	stationMainContent: {
		flex: 1,
		paddingRight: 8,
		gap: 2
	},
	stopName: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
		marginRight: 8,
		flex: 1,
	},
	iconContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: 0,
		flexShrink: 0,
	},
	favoriteButton: {
		padding: 6,
		width: 36,
		height: 36,
		alignItems: "center",
		justifyContent: "center"
	},
	expandIcon: {
		padding: 6,
		width: 36,
		height: 36,
		lineHeight: 24,
		textAlign: "center"
	},
	stopPredictionTitle: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#333"
	},
	expandedContent: {
		padding: 10,
		backgroundColor: "#f0f0f0",
		borderRadius: 5,
		marginTop: 5
	},
	predictionTableHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: "#ccc"
	},
	predictionRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingVertical: 8
	},
	predictionText: {
		fontSize: 14,
		color: "#333",
		flex: 1,
		textAlign: "center"
	},
	boldText: {
		fontWeight: "bold"
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center"
	},
	loadingText: {
		marginTop: 16,
		fontSize: 18,
		color: "#666"
	},
	stopHeader: {
		flexDirection: "row",
		alignItems: "center",
		width: "100%"
	},
	favoriteButton: {
		padding: 8
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
	},
	removedCard: {
		opacity: 0.7,
		backgroundColor: "#F8F8F8"
	}
});

export default Busses;