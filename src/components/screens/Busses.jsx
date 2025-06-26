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
	StatusBar
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const PredictionRow = React.memo(({ prediction }) => {
	const etaTextStyle = [styles.predictionText, styles.boldText, { textAlign: 'right' }];
	if (prediction.dly === "1") {
		etaTextStyle.push({ color: "#FF3B30" });
		etaTextStyle.push(styles.delayedText);
	} else if (prediction.prdctdn <= 2 || prediction.prdctdn === "DUE") {
		etaTextStyle.push({ color: "#34C759" });
		etaTextStyle.push(styles.dueText);
	}

	return (
		<View style={styles.predictionRow}>
			<Text style={[styles.tableCell, { flex: 1 }]}>{prediction.vid}</Text>
			<Text style={[styles.tableCell, { flex: 2 }]}>{prediction.des}</Text>
			<View style={styles.etaContainer}>
				<Text style={etaTextStyle}>
					{prediction.prdctdn <= 2 || prediction.prdctdn === "DUE"
						? "DUE"
						: `${prediction.prdctdn} min`}
				</Text>
			</View>
		</View>
	);
});

const SectionHeader = React.memo(({ section, onToggle }) => (
	<TouchableOpacity
		onPress={() => onToggle(section.routeNum)}
		style={styles.sectionHeaderContainer}
	>
		<View style={[styles.routeColorIndicator, { backgroundColor: section.routeClr }]} />
		<View style={styles.sectionHeaderContent}>
			<Text style={styles.routeTitle}>
				{section.routeNum} - {section.routeName}
			</Text>
			<Ionicons
				name={section.dropdownOn ? "chevron-up" : "chevron-down"}
				size={24}
				color="#666"
			/>
		</View>
	</TouchableOpacity>
));

function Busses() {
	const [search, setSearch] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [routes, setRoutes] = useState([]);
	const [favorites, setFavorites] = useState([]);
	const [stopPredictions, setStopPredictions] = useState({});

	useEffect(() => {
		const fetchRoutes = async () => {
			console.log("[Busses] Fetched all routes")
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

				const routesWithDirectionsAndStops = await Promise.all(
					routesData.map(async route => {
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

				setRoutes(routesWithDirectionsAndStops);
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

	const fetchAllPredictions = async () => {
		console.log('[Busses] Starting fetchAllPredictions');
		if (isRefreshing) {
			console.log('[Busses] Already refreshing, skipping');
			return;
		}
		setIsRefreshing(true);
		try {
			const expandedStops = routes.flatMap(route => 
				Object.entries(route.stops)
					.filter(([_, stopData]) => stopData.dropdownOn)
					.map(([stopName, stopData]) => ({
						routeNum: route.routeNum,
						stopName,
						stopData
					}))
			);
			console.log('[Busses] Expanded stops count:', expandedStops.length);

			if (expandedStops.length === 0) {
				console.log('[Busses] No expanded stops, skipping fetch');
				return;
			}

			const predictionPromises = expandedStops.flatMap(({ routeNum, stopName, stopData }) =>
				Object.entries(stopData.directions).map(([direction, data]) => {
					console.log(`[Busses] Fetching predictions for stop ${stopName} on route ${routeNum}`);
					return axios.get(
						`http://www.ctabustracker.com/bustime/api/v2/getpredictions?key=${process.env.EXPO_PUBLIC_CTA_BUS_API_KEY}&rt=${routeNum}&stpid=${data.stopId}&format=json`
					).then(response => ({
						stopId: data.stopId,
						predictions: response.data["bustime-response"].prd || []
					}));
				})
			);

			const results = await Promise.all(predictionPromises);
			console.log('[Busses] All predictions fetched successfully');
			
			const newPredictions = {};
			results.forEach(result => {
				newPredictions[result.stopId] = result.predictions;
			});
			
			setStopPredictions(prevPredictions => ({
				...prevPredictions,
				...newPredictions
			}));
		} catch (error) {
			console.error('[Busses] Error fetching predictions:', error);
		} finally {
			setIsRefreshing(false);
			console.log('[Busses] Finished fetchAllPredictions');
		}
	};

	// Add useEffect to fetch predictions when dropdown state changes
	useEffect(() => {
		console.log('[Busses] Dropdown state changed, checking for expanded stops');
		const hasExpandedStops = routes.some(route => 
			Object.values(route.stops).some(stop => stop.dropdownOn)
		);

		if (hasExpandedStops && !isRefreshing) {
			console.log('[Busses] Found expanded stops, triggering fetch');
			fetchAllPredictions();
		}
	}, [routes]);

	// Separate useEffect for periodic refresh
	useEffect(() => {
		console.log('[Busses] Setting up periodic refresh interval');
		const interval = setInterval(() => {
			console.log('[Busses] Periodic refresh triggered');
			const hasExpandedStops = routes.some(route => 
				Object.values(route.stops).some(stop => stop.dropdownOn)
			);

			if (hasExpandedStops && !isRefreshing) {
				console.log('[Busses] Found expanded stops during periodic refresh');
				fetchAllPredictions();
			}
		}, 60000);

		return () => {
			console.log('[Busses] Cleaning up periodic refresh interval');
			clearInterval(interval);
		};
	}, []);

	const filterStops = useCallback(
		route => {
			const searchLower = search.toLowerCase();
			return Object.keys(route.stops).filter(stopName =>
				stopName.toLowerCase().includes(searchLower)
			);
		},
		[search]
	);

	const sections = useMemo(
		() =>
			routes.map(route => ({
				...route,
				data: route.dropdownOn ? filterStops(route) : [],
				key: route.routeNum
			})),
		[routes, filterStops]
	);

	const isFavorite = (routeNum, stopName) => {
		const favoriteId = `${routeNum}-${stopName}`;
		return favorites.some(fav => fav.id === favoriteId && fav.type === 'bus');
	};

	const toggleFavorite = async (stopName, stopId, route) => {
		try {
			console.log(stopName);

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

			const savedFavorites = await AsyncStorage.getItem('favorites');
			let tempFavs = savedFavorites ? JSON.parse(savedFavorites) : [];

			const isFavorited = favorites.some(
				fav => fav.id === favoriteItem.id && fav.type === 'bus'
			);

			if (isFavorited) {
				tempFavs = tempFavs.filter(
					fav => !(fav.id === favoriteItem.id && fav.type === 'bus')
				);
			} else {
				tempFavs.push(favoriteItem);
			}

			await AsyncStorage.setItem('favorites', JSON.stringify(tempFavs));
			setFavorites(tempFavs);
		} catch (error) {
			console.error('Error toggling favorite:', error);
		}
	};

	const toggleRouteDropdown = useCallback(routeNum => {
		setRoutes(prevRoutes =>
			prevRoutes.map(route =>
				route.routeNum === routeNum
					? { ...route, dropdownOn: !route.dropdownOn }
					: route
			)
		);
	}, []);

	const toggleStopDropdown = useCallback((stopName, routeNum) => {
		console.log('[Busses] Toggling stop dropdown for:', stopName, 'on route:', routeNum);
		setRoutes(prevRoutes =>
			prevRoutes.map(route => {
				if (route.routeNum === routeNum) {
					return {
						...route,
						stops: {
							...route.stops,
							[stopName]: {
								...route.stops[stopName],
								dropdownOn: !route.stops[stopName].dropdownOn
							}
						}
					};
				}
				return route;
			})
		);
	}, []);

	const StopDirections = ({ directions, stopData }) => {
		return Object.entries(directions).map(([direction, data]) => {
			const predictions = stopPredictions[data.stopId] || [];
			const filteredPredictions = predictions.filter(pred => pred.rtdir === direction);
			
			return (
				<View key={direction} style={styles.directionContainer}>
					<Text style={styles.directionHeader}>{direction}</Text>
					<View style={styles.tableHeader}>
						<Text style={[styles.tableHeaderCell, { flex: 1 }]}>Bus</Text>
						<Text style={[styles.tableHeaderCell, { flex: 2 }]}>Destination</Text>
						<Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>ETA</Text>
					</View>
					{filteredPredictions.length > 0 ? (
						filteredPredictions.map((prediction, index) => (
							<PredictionRow
								key={`${prediction.vid}-${index}`}
								prediction={prediction}
							/>
						))
					) : (
						<Text style={styles.noPredictions}>No predictions available.</Text>
					)}
				</View>
			);
		});
	};

	const renderSectionHeader = useCallback(
		({ section }) => (
			<SectionHeader section={section} onToggle={toggleRouteDropdown} />
		),
		[toggleRouteDropdown]
	);

	const renderItem = useCallback(
		({ item, section }) => (
			<TouchableOpacity onPress={() => toggleStopDropdown(item, section.routeNum)} activeOpacity={0.7}>
				<View style={styles.stopCard}>
					<View 
						style={[
							styles.stopColorIndicator, 
							{ backgroundColor: section.routeClr }
						]}
					/>
					<View style={styles.stopInfo}>
						<View style={styles.stopHeader}>
							<View style={styles.stopMainContent}>
								<Text style={styles.stopName}>{item}</Text>
							</View>
							<View style={styles.iconContainer}>
								<TouchableOpacity 
									onPress={(e) => { 
										e.stopPropagation();
										toggleFavorite(
											item,
											section.stops[item].directions[Object.keys(section.stops[item].directions)[0]].stopId,
											section
										);
									}}
									style={styles.favoriteButton}
								>    
									<Ionicons 
										name={isFavorite(section.routeNum, item) ? "heart" : "heart-outline"} 
										size={24} 
										color={isFavorite(section.routeNum, item) ? "red" : "#666"} 
									/>
								</TouchableOpacity>
								<Ionicons 
									name={section.stops[item].dropdownOn ? "chevron-up" : "chevron-down"} 
									size={16}
									color="#666" 
									style={styles.expandIcon}
								/>
							</View>
						</View>

						{section.stops[item].dropdownOn && (
							<View style={styles.predictionsContainer}>
								<StopDirections
									directions={section.stops[item].directions}
									stopData={section.stops[item]}
								/>
							</View>
						)}
					</View>
				</View>
			</TouchableOpacity>
		),
		[toggleStopDropdown, favorites]
	);

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="dark-content" />
			<View style={styles.container}>
				{isLoading ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color="#007AFF" />
						<Text style={styles.loadingText}>Loading Bus Routes...</Text>
					</View>
				) : (
					<>
						<View style={styles.header}>
							<Text style={styles.title}>Chicago Bus Routes</Text>
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
						routes.flatMap(route => filterStops(route)).length < 1 ? (
							<Text style={styles.noMatch}>No Matching Stops</Text>
						) : (
							<SectionList
								sections={sections}
								keyExtractor={(item, index) => `${item}-${index}`}
								renderSectionHeader={renderSectionHeader}
								renderItem={renderItem}
								initialNumToRender={20}
								maxToRenderPerBatch={20}
								windowSize={20}
								getItemLayout={(data, index) => ({
									length: 60,
									offset: 60 * index,
									index
								})}
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
		padding: 16
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#333"
	},
	searchContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#fff",
		borderRadius: 8,
		paddingHorizontal: 12,
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
	sectionHeaderContainer: {
		flexDirection: 'row',
		alignItems: 'stretch',
		backgroundColor: "#fff",
		borderRadius: 8,
		marginBottom: 8,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
		overflow: 'hidden',
	},
	sectionHeaderContent: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 12,
		flex: 1,
	},
	routeTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333"
	},
	routeColorIndicator: {
		width: 6,
	},
	stopCard: {
		flexDirection: 'row',
		alignItems: 'stretch',
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		marginBottom: 12,
		marginLeft: 6,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
		overflow: 'hidden',
	},
	stopColorIndicator: {
		width: 6,
	},
	stopInfo: {
		flex: 1,
		padding: 12,
	},
	stopHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 2,
	},
	stopMainContent: {
		flex: 1,
		paddingRight: 8,
		gap: 2,
	},
	stopName: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#333333',
		flexShrink: 1,
	},
	iconContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 0,
	},
	favoriteButton: {
		padding: 6,
		width: 36, 
		height: 36,
		alignItems: 'center',
		justifyContent: 'center',
	},
	expandIcon: {
		padding: 6,
		width: 36,
		height: 36,
		lineHeight: 24,
		textAlign: 'center',
	},
	predictionsContainer: {
		marginTop: 10,
		backgroundColor: '#F9F9F9',
		borderRadius: 8,
		padding: 10,
	},
	directionContainer: {
		marginBottom: 8,
	},
	directionHeader: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#333333',
		marginBottom: 6
	},
	tableHeader: {
		flexDirection: 'row',
		paddingBottom: 6,
		marginBottom: 2,
	},
	tableHeaderCell: {
		fontSize: 13,
		fontWeight: '600',
		color: '#666666',
		textTransform: 'uppercase',
		textAlign: 'left'
	},
	predictionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 6,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: '#EEEEEE',
	},
	tableCell: {
		fontSize: 15,
		color: '#333333',
		textAlign: 'left'
	},
	etaContainer: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		flex: 1
	},
	predictionText: {
		fontSize: 15,
		color: '#333333',
		textAlign: 'left'
	},
	boldText: {
		fontWeight: 'bold'
	},
	delayedText: {
		color: '#FF3B30',
	},
	dueText: {
		color: '#34C759',
	},
	noPredictions: {
		fontSize: 15,
		color: '#999999',
		textAlign: 'center',
		paddingVertical: 10,
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
	refreshButton: {
		padding: 6,
		borderRadius: 20,
		backgroundColor: '#F0F8FF',
		width: 36,
		height: 36,
		alignItems: 'center',
		justifyContent: 'center',
	},
});

export default Busses;