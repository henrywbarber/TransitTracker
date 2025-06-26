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
	} else if (prediction.prdctdn <= 2 || prediction.prdctdn === "DUE") {
		etaTextStyle.push({ color: "#34C759" });
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
});

const StopDirections = React.memo(({ directions, stopData }) => {
	return Object.entries(directions).map(([direction, data]) => (
		<View key={direction} style={{ paddingTop: 10 }}>
			<Text style={styles.stopPredictionTitle}>{direction}</Text>
			<View style={styles.predictionTableHeader}>
				<Text style={[styles.predictionText, styles.boldText]}>Bus</Text>
				<Text style={[styles.predictionText, styles.boldText]}>
					Destination
				</Text>
				<Text style={[styles.predictionText, styles.boldText, { textAlign: 'right' }]}>ETA</Text>
			</View>
			{data.predictions.length > 0 ? (
				data.predictions.map((prediction, index) => (
					<PredictionRow
						key={`${prediction.vid}-${index}`}
						prediction={prediction}
					/>
				))
			) : (
				<Text style={[styles.predictionText, { padding: 10 }]}>
					No predictions available.
				</Text>
			)}
		</View>
	));
}, (prevProps, nextProps) => {
	return JSON.stringify(prevProps.directions) === JSON.stringify(nextProps.directions);
});

const SectionHeader = React.memo(({ section, onToggle }) => (
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
));

// Updated LoadMoreButton component
const LoadMoreButton = React.memo(({ onPress, isLoading, hasMore, currentCount, totalCount }) => {
	if (!hasMore) return null;
	
	return (
		<View style={styles.loadMoreContainer}>
			<TouchableOpacity 
				style={[styles.loadMoreButton, isLoading && styles.loadMoreButtonDisabled]} 
				onPress={onPress}
				disabled={isLoading}
			>
				{isLoading ? (
					<View style={styles.loadMoreButtonContent}>
						<ActivityIndicator size="small" color="#fff" />
						<Text style={styles.loadMoreButtonText}>Loading...</Text>
					</View>
				) : (
					<Text style={styles.loadMoreButtonText}>
						Load More Routes ({currentCount} of {totalCount})
					</Text>
				)}
			</TouchableOpacity>
		</View>
	);
});

export default function Busses() {
	const [search, setSearch] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [routes, setRoutes] = useState([]);
	const [favorites, setFavorites] = useState([]);
	const [displayedRoutesCount, setDisplayedRoutesCount] = useState(30); // Start with 30 routes
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const ROUTES_PER_PAGE = 30;

	useEffect(() => {
		const fetchRoutes = async () => {
			console.log("[Busses] Fetched all routes")
			try {
				console.log(`Sending fetch to http://www.ctabustracker.com/bustime/api/v2/getroutes?key=${process.env.EXPO_PUBLIC_CTA_BUS_API_KEY}&format=json`)
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

			setRoutes(prevRoutes =>
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

	// Modified sections to limit displayed routes
	const sections = useMemo(() => {
		const limitedRoutes = routes.slice(0, displayedRoutesCount);
		return limitedRoutes.map(route => ({
			...route,
			data: route.dropdownOn ? filterStops(route) : [],
			key: route.routeNum
		}));
	}, [routes, filterStops, displayedRoutesCount]);

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
		setRoutes(prevRoutes =>
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

	// Function to handle loading more routes when button is pressed
	const loadMoreRoutes = useCallback(() => {
		if (isLoadingMore || displayedRoutesCount >= routes.length) {
			return;
		}
		
		console.log(`Loading more routes. Current: ${displayedRoutesCount}, Total: ${routes.length}`);
		setIsLoadingMore(true);
		
		// Simulate loading delay for better UX
		setTimeout(() => {
			setDisplayedRoutesCount(prev => {
				const newCount = Math.min(prev + ROUTES_PER_PAGE, routes.length);
				console.log(`Updated displayed routes from ${prev} to ${newCount}`);
				return newCount;
			});
			setIsLoadingMore(false);
		}, 500); // Small delay to show loading state
	}, [isLoadingMore, routes.length, displayedRoutesCount]);

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
									item,
									section.stops[item].directions[Object.keys(section.stops[item].directions)[0]].stopId,
									section
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
		[toggleStopDropdown, toggleFavorite, isFavorite]
	);

	// Check if there are more routes to load
	const hasMoreRoutes = displayedRoutesCount < routes.length;

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
							<Text style={styles.headerTitle}>Chicago Bus Routes</Text>
							<Text style={styles.routeCounter}>
								Showing {displayedRoutesCount} of {routes.length} routes
							</Text>
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
							<>
								<SectionList
									sections={sections}
									keyExtractor={(item, index) => `${item}-${index}`}
									renderSectionHeader={renderSectionHeader}
									renderItem={renderItem}
									initialNumToRender={ROUTES_PER_PAGE}
									maxToRenderPerBatch={ROUTES_PER_PAGE}
									windowSize={5}
									scrollEventThrottle={16}
									removeClippedSubviews={true}
									// Removed onEndReached and onEndReachedThreshold
									ListFooterComponent={
										<LoadMoreButton 
											onPress={loadMoreRoutes}
											isLoading={isLoadingMore}
											hasMore={hasMoreRoutes}
											currentCount={displayedRoutesCount}
											totalCount={routes.length}
										/>
									}
									getItemLayout={(data, index) => ({
										length: 60,
										offset: 60 * index,
										index
									})}
								/>
							</>
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
		marginBottom: 16
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#333"
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
	loadMoreContainer: {
		padding: 20,
		alignItems: "center",
		backgroundColor: "#f9f9f9",
	},
	loadMoreButton: {
		backgroundColor: "#007AFF",
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
		minWidth: 200,
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3
	},
	loadMoreButtonDisabled: {
		backgroundColor: "#999",
		opacity: 0.7
	},
	loadMoreButtonContent: {
		flexDirection: "row",
		alignItems: "center",
	},
	loadMoreButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
		marginLeft: 8
	}
});