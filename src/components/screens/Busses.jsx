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

const PredictionRow = ({ prediction }) => {
	const etaTextStyle = [styles.predictionText, styles.boldText];
	if (prediction.dly === "1") {
		etaTextStyle.push({ color: "red" });
	} else if (prediction.prdctdn <= 2 || prediction.prdctdn === "DUE") {
		etaTextStyle.push({ color: "green" });
	}

	return (
		<View style={styles.predictionRow}>
			<Text style={styles.predictionText}>{prediction.vid}</Text>
			<Text style={styles.predictionText}>{prediction.des}</Text>
			<Text style={etaTextStyle}>
				{prediction.prdctdn <= 2 || prediction.prdctdn === "DUE"
					? "DUE"
					: `${prediction.prdctdn} min`}
			</Text>
		</View>
	);
};

const StopDirections = ({ directions, stopData }) => {
	return Object.entries(directions).map(([direction, data]) => (
		<View key={direction} style={{ paddingTop: 10 }}>
			<Text style={styles.stopPredictionTitle}>{direction}</Text>
			<View style={styles.predictionTableHeader}>
				<Text style={[styles.predictionText, styles.boldText]}>Bus</Text>
				<Text style={[styles.predictionText, styles.boldText]}>
					Destination
				</Text>
				<Text style={[styles.predictionText, styles.boldText]}>ETA</Text>
			</View>
			{data.predictions.length > 0 ? (
				data.predictions.map((prediction, index) => (
					<PredictionRow
						key={`${prediction.vid}-${index}`}
						prediction={prediction}
					/>
				))
			) : (
				<Text style={[styles.predictionText, { padding: 10 }]}>No predictions available.</Text>
			)}
		</View>
	));
};

const SectionHeader = ({ section, onToggle }) => (
	<TouchableOpacity
		onPress={() => onToggle(section.routeNum)}
		style={[styles.sectionHeader, { borderLeftColor: section.routeClr }]}
	>
		<Text style={styles.routeTitle}>
			{section.routeNum} - {section.routeName}
		</Text>
		<Ionicons
			name={section.dropdownOn ? "chevron-up" : "chevron-down"}
			size={24}
			color="#666"
		/>
	</TouchableOpacity>
);

function Busses() {
	const [search, setSearch] = useState("");
	const [isLoadingStops, setIsLoadingStops] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [routes, setRoutes] = useState([]);
	const [favorites, setFavorites] = useState([]);

	useEffect(() => {
		const fetchRoutes = async () => {
			console.log('[Busses] Starting fetch for routes');
			try {
				const routesResponse = await axios.get(
					`http://www.ctabustracker.com/bustime/api/v2/getroutes?key=${process.env.EXPO_PUBLIC_CTA_BUS_API_KEY}&format=json`
				);

				// console.log(
				//   "First 3 Routes:",
				//   routesResponse.data["bustime-response"].routes.slice(0, 3)
				// );

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
				console.log('[Busses] Successfully fetched routes');
			} catch (error) {
				console.error('[Busses] Error fetching bus route data:', error);
			} finally {
				setIsLoadingStops(false);
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
						const busFavs = tempFavs.filter(f => f.type === 'bus')
						setFavorites(busFavs)
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
			// Only fetch predictions for expanded stops
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
						routeNum,
						stopName,
						direction,
						predictions: response.data["bustime-response"].prd || []
					}));
				})
			);

			const results = await Promise.all(predictionPromises);
			console.log('[Busses] All predictions fetched successfully');
			
			setRoutes(prevRoutes =>
				prevRoutes.map(route => {
					const routePredictions = results.filter(r => r.routeNum === route.routeNum);
					
					return {
						...route,
						stops: Object.fromEntries(
							Object.entries(route.stops).map(([stopName, stopData]) => [
								stopName,
								{
									...stopData,
									directions: Object.fromEntries(
										Object.entries(stopData.directions).map(([direction, data]) => [
											direction,
											{
												...data,
												predictions: routePredictions
													.find(r => r.stopName === stopName && r.direction === direction)
													?.predictions.filter(pred => pred.rtdir === direction) || []
											}
										])
									)
								}
							])
						)
					};
				})
			);
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
		} else {
			console.log('[Busses] No expanded stops found or already refreshing');
		}
	}, [routes]);

	// Separate useEffect for periodic refresh - only run once when component mounts
	useEffect(() => {
		console.log('[Busses] Setting up periodic refresh interval');
		let intervalId = null;

		const checkAndFetch = () => {
			console.log('[Busses] Periodic refresh triggered');
			const hasExpandedStops = routes.some(route => 
				Object.values(route.stops).some(stop => stop.dropdownOn)
			);

			if (hasExpandedStops && !isRefreshing) {
				console.log('[Busses] Found expanded stops during periodic refresh');
				fetchAllPredictions();
			} else {
				console.log('[Busses] No expanded stops during periodic refresh or already refreshing');
			}
		};

		// Initial check
		checkAndFetch();

		// Set up interval
		intervalId = setInterval(checkAndFetch, 60000);

		return () => {
			console.log('[Busses] Cleaning up periodic refresh interval');
			if (intervalId) {
				clearInterval(intervalId);
			}
		};
	}, []); // Empty dependency array means this only runs once when component mounts

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
			console.log(stopName)

			const dirWithStops = Object.fromEntries(
				Object.entries(route.stops[stopName].directions).map(
				  ([direction, data]) => [direction, data.stopId]
				)
			);
			//console.log(dirWithStops)
			const favoriteItem = {
				id: `${route.routeNum}-${stopName}`, 
				name: `${route.routeName} - ${stopName}`,
				type: 'bus',
				color: route.routeClr,
				stopIds: dirWithStops,
				routeNumber: route.routeNum  //use for predictions
			};

			// Get current favorites
			const savedFavorites = await AsyncStorage.getItem('favorites');
			let tempFavs = savedFavorites ? JSON.parse(savedFavorites) : [];

			// Check if already favorited
			const isFavorited = favorites.some(
				fav => fav.id === favoriteItem.id && fav.type === 'bus'
			);

			if (isFavorited) {
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
							style: "destructive",
							onPress: async () => {
								tempFavs = tempFavs.filter(
									fav => !(fav.id === favoriteItem.id && fav.type === 'bus')
								);
								await AsyncStorage.setItem('favorites', JSON.stringify(tempFavs));
								setFavorites(tempFavs);
							}
						}
					]
				);
			} else {
				tempFavs.push(favoriteItem);
				await AsyncStorage.setItem('favorites', JSON.stringify(tempFavs));
				setFavorites(tempFavs);
			}
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
		console.log('Busses: Toggling stop dropdown for:', stopName, 'on route:', routeNum);
		setRoutes(prevRoutes =>
			prevRoutes.map(route => {
				if (route.routeNum === routeNum) {
					const isExpanding = !route.stops[stopName].dropdownOn;
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
			<SectionHeader section={section} onToggle={toggleRouteDropdown} />
		),
		[toggleRouteDropdown]
	);

	const renderItem = useCallback(
		({ item, section }) => (
			<TouchableOpacity
				onPress={() => toggleStopDropdown(item, section.routeNum)}
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
							<TouchableOpacity 
								onPress={() => toggleFavorite(
									item, // stopName
									section.stops[item].directions[Object.keys(section.stops[item].directions)[0]].stopId, // stopId
									section // route info
								)}
								style={styles.favoriteButton}
							>	
								<Ionicons 
									name={isFavorite(section.routeNum, item) ? "heart" : "heart-outline"} 
									size={24} 
									color={isFavorite(section.routeNum, item) ? "red" : "#666"} 
								/>
							</TouchableOpacity>
						</View>
						{section.stops[item].dropdownOn && (
							<View style={styles.expandedContent}>
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
			<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
			<View style={styles.container}>
				{isLoadingStops ? (
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
		backgroundColor: '#F8F8F8',
	},
	container: {
		flex: 1,
		paddingHorizontal: 12,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		height: 56,
		borderBottomWidth: 1,
		borderBottomColor: '#EEEEEE',
	},
	title: { 
		fontSize: 28, 
		fontWeight: 'bold', 
		color: '#333333',
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
	sectionHeader: {
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
	routeTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333"
	},
	stopCard: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#fff",
		borderRadius: 8,
		marginBottom: 8,
		padding: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2
	},
	stopColorIndicator: {
		width: 8,
		height: "100%",
		borderRadius: 4,
		marginRight: 12
	},
	stopInfo: {
		flex: 1
	},
	stopName: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333"
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
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		width: '100%'
	},
	favoriteButton: {
		padding: 8,
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
