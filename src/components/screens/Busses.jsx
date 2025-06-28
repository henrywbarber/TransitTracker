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
	// Custom comparison function to prevent unnecessary re-renders
	// Only re-render if the predictions have changed
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

function Busses() {
	const [search, setSearch] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [allRoutes, setAllRoutes] = useState([]);
	const [displayedRoutes, setDisplayedRoutes] = useState([]);
	const [currentPage, setCurrentPage] = useState(0);
	const [favorites, setFavorites] = useState([]);
	
	const ROUTES_PER_PAGE = 20;

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

				// Store all routes
				setAllRoutes(routesData);
				
				// Process and display first page
				const firstPageRoutes = routesData.slice(0, ROUTES_PER_PAGE);
				const processedRoutes = await processRouteData(firstPageRoutes);
				setDisplayedRoutes(processedRoutes);
				setCurrentPage(1);

			} catch (error) {
				console.error("Error fetching bus route data:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchRoutes();
		
	}, []);

	const loadMoreRoutes = async () => {
		if (isLoadingMore) return;
		
		const startIndex = currentPage * ROUTES_PER_PAGE;
		const endIndex = startIndex + ROUTES_PER_PAGE;
		
		if (startIndex >= allRoutes.length) return;
		
		setIsLoadingMore(true);
		
		try {
			const nextPageRoutes = allRoutes.slice(startIndex, endIndex);
			const processedRoutes = await processRouteData(nextPageRoutes);
			
			setDisplayedRoutes(prevRoutes => [...prevRoutes, ...processedRoutes]);
			setCurrentPage(prevPage => prevPage + 1);
			
		} catch (error) {
			console.error("Error loading more routes:", error);
		} finally {
			setIsLoadingMore(false);
		}
	};

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

			setDisplayedRoutes(prevRoutes =>
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

	const sections = useMemo(
		() =>
			displayedRoutes.map((route, index) => ({
				...route,
				data: route.dropdownOn ? filterStops(route) : [],
				key: `${route.routeNum}-${index}`, // More unique key
				sectionIndex: index // Add section index for better tracking
			})),
		[displayedRoutes, filterStops]
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
				tempFavs = tempFavs.filter(
					fav => !(fav.id === favoriteItem.id && fav.type === 'bus')
				);
			} else {
				// Add to favorites
				tempFavs.push(favoriteItem);
			}

			// Save updated favorites
			await AsyncStorage.setItem('favorites', JSON.stringify(tempFavs));
			setFavorites(tempFavs);
		} catch (error) {
			console.error('Error toggling favorite:', error);
		}
	};

	const toggleRouteDropdown = useCallback(routeNum => {
		setDisplayedRoutes(prevRoutes =>
			prevRoutes.map(route =>
				route.routeNum === routeNum
					? { ...route, dropdownOn: !route.dropdownOn }
					: route
			)
		);
	}, []);

	const toggleStopDropdown = useCallback((stopName, routeNum) => {
		setDisplayedRoutes(prevRoutes =>
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
		[toggleStopDropdown, toggleFavorite, isFavorite]
	);

	const hasMoreRoutes = currentPage * ROUTES_PER_PAGE < allRoutes.length;

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
								Showing {displayedRoutes.length} of {allRoutes.length} routes
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
						displayedRoutes.flatMap(route => filterStops(route)).length < 1 ? (
							<Text style={styles.noMatch}>No Matching Stops</Text>
						) : (
							<>
								<SectionList
									sections={sections}
									keyExtractor={(item, index, section) => {
										const sectionKey = section?.key || `section-${index}`;
										return `${sectionKey}-${item}-${index}`;
									}}
									renderSectionHeader={renderSectionHeader}
									renderItem={renderItem}
									stickySectionHeadersEnabled={false}
									initialNumToRender={8}
									maxToRenderPerBatch={8}
									windowSize={8}
									updateCellsBatchingPeriod={100}
									removeClippedSubviews={false}
									getItemLayout={null}
									legacyImplementation={false}
									disableVirtualization={false}
								/>
								{hasMoreRoutes && (
									<View style={styles.loadMoreContainer}>
										<TouchableOpacity
											style={styles.loadMoreButton}
											onPress={loadMoreRoutes}
											disabled={isLoadingMore}
										>
											{isLoadingMore ? (
												<ActivityIndicator size="small" color="#007AFF" />
											) : (
												<Text style={styles.loadMoreText}>
													Load More Routes ({allRoutes.length - displayedRoutes.length} remaining)
												</Text>
											)}
										</TouchableOpacity>
									</View>
								)}
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
		paddingVertical: 16,
		alignItems: 'center'
	},
	loadMoreButton: {
		backgroundColor: '#007AFF',
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
		minHeight: 44,
		justifyContent: 'center',
		alignItems: 'center'
	},
	loadMoreText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600'
	}
});

export default Busses;