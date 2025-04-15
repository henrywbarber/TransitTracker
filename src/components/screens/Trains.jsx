import React, { useState, useEffect, useCallback } from "react";
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
import { FontAwesome } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';


function Trains() {
	const [search, setSearch] = useState("");
	const [isLoadingStations, setIsLoadingStations] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [favorites, setFavorites] = useState([]);
	const [stationPredictions, setStationPredictions] = useState([]);
	const [lines, setLines] = useState([
		{
			label: "Red",
			codes: ["red"],
			color: "#c60c30",
			stations: [],
			dropdownOn: false,
			directions: {
				1: "Howard-bound",
				5: "95th/Dan Ryan-bound"
			}
		},
		{
			label: "Blue",
			codes: ["blue"],
			color: "#00a1de",
			stations: [],
			dropdownOn: false,
			directions: {
				1: "O'Hare-bound",
				5: "Forest Park-bound"
			}
		},
		{
			label: "Brown",
			codes: ["brn"],
			color: "#62361b",
			stations: [],
			dropdownOn: false,
			directions: {
				1: "Kimball-bound",
				5: "Loop-bound"
			}
		},
		{
			label: "Green",
			codes: ["g"],
			color: "#009b3a",
			stations: [],
			dropdownOn: false,
			directions: {
				1: "Harlem/Lake-bound",
				5: "Ashland/63rd- or Cottage Grove-bound"
			}
		},
		{
			label: "Orange",
			codes: ["o", "Org"],
			color: "#f9461c",
			stations: [],
			dropdownOn: false,
			directions: {
				1: "Loop-bound",
				5: "Midway-bound"
			}
		},
		{
			label: "Pink",
			codes: ["pnk", "Pink"],
			color: "#e27ea6",
			stations: [],
			dropdownOn: false,
			directions: {
				1: "Loop-bound",
				5: "54th/Cermak-bound"
			}
		},
		{
			label: "Purple",
			codes: ["p", "pexp"],
			color: "#522398",
			stations: [],
			dropdownOn: false,
			directions: {
				1: "Linden-bound",
				5: "Howard- or Loop-bound"
			}
		},
		{
			label: "Yellow",
			codes: ["y"],
			color: "#f9e300",
			stations: [],
			dropdownOn: false,
			directions: {
				1: "Skokie-bound",
				5: "Howard-bound"
			}
		}
	]);

	useEffect(() => {
		const fetchStations = async () => {
			console.log('[Trains] Starting fetch for stations');
			try {
				const response = await axios.get(
					"https://data.cityofchicago.org/resource/8pix-ypme.json"
				);

				const stopData = response.data;

				let updatedLines = lines.map(line => ({
					...line,
					stations: []
				}));

				stopData.forEach(stop => {
					const mapId = stop.map_id;

					updatedLines = updatedLines.map(line => {
						if (line.codes.some(code => stop[code])) {
							const stationExists = line.stations.some(
								station => station.map_id === mapId
							);

							if (!stationExists) {
								return {
									...line,
									stations: [
										...line.stations,
										{
											map_id: mapId,
											station_name: stop.station_name,
											station_descriptive_name: stop.station_descriptive_name,
											stops: [
												{
													stop_id: stop.stop_id,
													stop_name: stop.stop_name
												}
											],
											ada: stop.ada,
											line_label: line.label,
											line_codes: line.codes,
											line_color: line.color,
											dropdownOn: false,
											lineLabel: line.label,
											lineColor: line.color,
											directions: line.directions
										}
									]
								};
							} else {
								return {
									...line,
									stations: line.stations.map(station => {
										if (station.map_id === mapId) {
											// Ensure directions are present even when updating existing station
											const updatedStation = { ...station, directions: line.directions }; 
											if (
												!updatedStation.stops.some(s => s.stop_id === stop.stop_id)
											) {
												return {
													...updatedStation,
													stops: [
														...updatedStation.stops,
														{
															stop_id: stop.stop_id,
															stop_name: stop.stop_name
														}
													]
												};
											}
											return updatedStation; // Return updated station even if stop wasn't added
										}
										return station;
									})
								};
							}
						}
						return line;
					});
				});

				setLines(updatedLines);
				console.log('[Trains] Successfully fetched stations');
			} catch (error) {
				console.error('[Trains] Error fetching train station data:', error);
			} finally {
				setIsLoadingStations(false);
			}
		};

		fetchStations();
	}, []);

	useFocusEffect(
		useCallback(() => {
			const loadFavorites = async () => {
				try {
					const savedFavorites = await AsyncStorage.getItem('favorites');
					if (savedFavorites) {
						const tempFavs = JSON.parse(savedFavorites);
						const trainFavs = tempFavs.filter(f => f.type === 'train')
						setFavorites(trainFavs)
					}
				} catch (error) {
					console.error('Error loading favorites:', error);
				}
			};

			loadFavorites();
		}, [])
	);

	const fetchStopPredictions = async stopId => {
		try {
			// console.log(`Fetching Station Predictions for stopId: ${stopId}`);

			const response = await axios.get(
				`https://lapi.transitchicago.com/api/1.0/ttarrivals.aspx?key=${process.env.EXPO_PUBLIC_CTA_TRAIN_API_KEY}&stpid=${stopId}&outputType=JSON`
			);

			// console.log("Raw Response Data:", response.data); // Log the raw response data to inspect its structure

			const predictionsData = response.data.ctatt
				? response.data.ctatt.eta
				: [];
			// console.log(`Predictions for stopId ${stopId}:`, predictionsData); // Log extracted predictions data

			setStationPredictions(prevStationPredictions => {
				const updatedPredictions = {
					...prevStationPredictions,
					[stopId]: predictionsData
				};
				//   console.log("Updated Station Predictions State:", updatedPredictions); // Log the updated state
				return updatedPredictions;
			});
		} catch (error) {
			console.error(`Error fetching predictions for stopId ${stopId}:`, error);
		}
	};

	const fetchAllPredictions = async () => {
		console.log('[Trains] Starting fetchAllPredictions');
		setIsRefreshing(true);
		try {
			// Only fetch predictions for expanded stations
			const expandedStations = lines.flatMap(line => 
				line.stations.filter(station => station.dropdownOn)
			);
			console.log('[Trains] Expanded stations count:', expandedStations.length);

			if (expandedStations.length === 0) {
				console.log('[Trains] No expanded stations, skipping fetch');
				return;
			}

			const predictionPromises = expandedStations.flatMap(station =>
				station.stops.map(async stop => {
					console.log('[Trains] Fetching predictions for stop', stop.stop_id);
					const response = await axios.get(
						`https://lapi.transitchicago.com/api/1.0/ttarrivals.aspx?key=${process.env.EXPO_PUBLIC_CTA_TRAIN_API_KEY}&stpid=${stop.stop_id}&outputType=JSON`
					);
					return {
						stopId: stop.stop_id,
						predictions: response.data.ctatt?.eta || []
					};
				})
			);

			const results = await Promise.all(predictionPromises);
			console.log('[Trains] All predictions fetched successfully');
			
			const newPredictions = {};
			results.forEach(result => {
				newPredictions[result.stopId] = result.predictions;
			});
			
			setStationPredictions(newPredictions);
		} catch (error) {
			console.error('[Trains] Error fetching predictions:', error);
		} finally {
			setIsRefreshing(false);
			console.log('[Trains] Finished fetchAllPredictions');
		}
	};

	// Add useEffect to fetch predictions when dropdown state changes
	useEffect(() => {
		console.log('[Trains] Dropdown state changed, checking for expanded stations');
		const hasExpandedStations = lines.some(line => 
			line.stations.some(station => station.dropdownOn)
		);

		if (hasExpandedStations) {
			console.log('[Trains] Found expanded stations, triggering fetch');
			fetchAllPredictions();
		} else {
			console.log('[Trains] No expanded stations found');
		}
	}, [lines]);

	// Separate useEffect for periodic refresh - only run once when component mounts
	useEffect(() => {
		console.log('[Trains] Setting up periodic refresh interval');
		const interval = setInterval(() => {
			console.log('[Trains] Periodic refresh triggered');
			const hasExpandedStations = lines.some(line => 
				line.stations.some(station => station.dropdownOn)
			);

			if (hasExpandedStations) {
				console.log('[Trains] Found expanded stations during periodic refresh');
				fetchAllPredictions();
			} else {
				console.log('[Trains] No expanded stations during periodic refresh');
			}
		}, 60000);

		return () => {
			console.log('[Trains] Cleaning up periodic refresh interval');
			clearInterval(interval);
		};
	}, []); // Empty dependency array means this only runs once when component mounts

	const isFavorite = (station) => {
		return favorites.some(
			fav => fav.id === `${station.line_color}-${station.map_id}` && fav.type === 'train'
		);
	};

	const toggleFavorite = async (station) => {
		try {
			//console.log(station)
			const favoriteItem = {
				id: `${station.line_color}-${station.map_id}`,
				name: station.station_name,
				type: 'train',
				color: station.line_color,
				stopId: station.stops.map(s => s.stop_id)  // Include stopId for predictions
			};
			
			const currFavorites = await AsyncStorage.getItem('favorites')
			let tempFavs = currFavorites ? JSON.parse(currFavorites) : []

			if (favorites.some(
				fav => fav.id === `${station.line_color}-${station.map_id}` && fav.type === 'train')
			) {
				Alert.alert(
					"Remove Favorite",
					`Are you sure you want to remove ${station.station_name} from your favorites?`,
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
									fav => !(fav.id === `${station.line_color}-${station.map_id}` && fav.type === 'train')
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

	// Modify toggleStopDropdown to use fetchAllPredictions
	const toggleStopDropdown = item => {
		console.log('[Trains] Toggling stop dropdown for:', item.station_name);
		setLines(prevLines =>
			prevLines.map(line => {
				if (
					line.stations.some(station => station.map_id === item.map_id) &&
					line.label == item.lineLabel
				) {
					const updatedStations = line.stations.map(station =>
						station.map_id === item.map_id
							? {
									...station,
									dropdownOn: !station.dropdownOn
							  }
							: station
					);
					return { ...line, stations: updatedStations };
				}
				return line;
			})
		);
	};

	const handleSearch = text => {
		setSearch(text);
		setLines(prevLines =>
			prevLines.map(line => ({
				...line,
				stations: line.stations.map(station => ({
					...station,
					dropdownOn: false
				}))
			}))
		);
	};

	const filterStations = line => {
		return line.stations.filter(stop =>
			stop.station_name.toLowerCase().includes(search.toLowerCase())
		);
	};

	const extractConnections = stopName => {
		const regex = /\(([^)]+)\)/g;
		const matches = [...stopName.matchAll(regex)];
		return matches.map(match => match[1]).join(", ");
	};

	const toggleDropdown = lineLabel => {
		setLines(prevLines =>
			prevLines.map(line =>
				line.label === lineLabel
					? { ...line, dropdownOn: !line.dropdownOn }
					: line
			)
		);
	};

	const renderSectionHeader = ({ section }) =>
		search.length > 0 ? null : (
			<TouchableOpacity
				onPress={() => toggleDropdown(section.title)}
				style={styles.sectionHeaderContainer}
			>
				<View style={[styles.stationColorIndicator, { backgroundColor: section.color }]} />
				<View style={styles.sectionHeaderContent}>
					<Text style={styles.lineTitle}>{section.title} Line</Text>
					<Ionicons
						name={section.data.length > 0 ? "chevron-up" : "chevron-down"}
						size={24}
						color="#666"
					/>
				</View>
			</TouchableOpacity>
		);

	const renderItem = ({ item, section }) => (
		<TouchableOpacity onPress={() => toggleStopDropdown(item)} activeOpacity={0.7}>
			<View style={styles.stationCard}>
				<View 
					style={[
						styles.stationColorIndicator, 
						{ backgroundColor: search.length > 0 ? item.line_color : section.color }
					]}
				/>
				<View style={styles.stationInfo}>
					<View style={styles.stationHeader}>
						<View style={styles.stationMainContent}>
							<View style={styles.stationNameContainer}>
								<Text style={styles.stationName}>{item.station_name}</Text>
								{item.ada && (
									<FontAwesome 
										name="wheelchair" 
										size={14} 
										color="black" 
									/>
								)}
							</View>
							<View style={styles.connectionContainer}>
								<Ionicons 
									name="git-branch-outline"
									size={14} 
									color="#666"
									style={styles.connectionIcon}
								/>
								<Text style={styles.stationSubText}>
									{extractConnections(item.station_descriptive_name) || 'None'}
								</Text>
							</View>
						</View>
						<View style={styles.iconContainer}>
							<TouchableOpacity 
								onPress={(e) => { 
									e.stopPropagation();
									toggleFavorite(item);
								}}
								style={styles.favoriteButton}
							>    
								<Ionicons 
									name={isFavorite(item) ? "heart" : "heart-outline"} 
									size={24} 
									color={isFavorite(item) ? "red" : "#666"} 
								/>
							</TouchableOpacity>
							<Ionicons 
								name={item.dropdownOn ? "chevron-up" : "chevron-down"} 
								size={16}
								color="#666" 
								style={styles.expandIcon}
							/>
						</View>
					</View>

					{item.dropdownOn && (
						<View style={styles.predictionsContainer}>
							{item.stops.map((stop, stopIndex) => {
								const rawPredictions = stationPredictions[stop.stop_id] || [];

								const lineCodesToCompare = item.line_codes.map(code =>
									code.toLowerCase()
								);

								// Group predictions by direction (stop description)
								const groupedPredictions = rawPredictions
									.filter(prediction => lineCodesToCompare.includes(prediction.rt.toLowerCase()))
									.reduce((acc, prediction) => {
										const direction = item.directions[prediction.dir] || prediction.stpDe;
										if (!acc[direction]) {
											acc[direction] = [];
										}
										acc[direction].push(prediction);
										return acc;
									}, {});

								return (
									<View
										key={stopIndex}
										style={[
											styles.stopPredictionsContainer,
											stopIndex === item.stops.length - 1 && { borderBottomWidth: 0, marginBottom: 0 }
										]}
									>
										{Object.entries(groupedPredictions).length > 0 ? (
											Object.entries(groupedPredictions).map(([direction, predictions], dirIndex, dirArray) => (
												<View 
													key={`${direction}-${dirIndex}`} 
													style={[
														styles.directionContainer, 
														dirIndex === dirArray.length - 1 && { marginBottom: 0 }
													]}
												>
													<Text style={styles.directionHeader}>{direction}</Text>
													<View style={styles.tableHeader}>
														<Text style={[styles.tableHeaderCell, { flex: 1 }]}>Run</Text>
														<Text style={[styles.tableHeaderCell, { flex: 2 }]}>To</Text>
														<Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>ETA</Text>
													</View>
													{predictions.map((prediction, index) => {
														const arrivalTime = new Date(prediction.arrT);
														const currentTime = new Date();
														const timeDiff = Math.round((arrivalTime - currentTime) / 60000);
														const isDue = prediction.isApp === "1" || timeDiff <= 2;

														return (
															<View key={index} style={[
																styles.tableRow,
																index === predictions.length - 1 && { borderBottomWidth: 0 }
															]}>
																<Text style={[styles.tableCell, { flex: 1 }]}>
																	{prediction.rn}
																</Text>
																<Text style={[styles.tableCell, { flex: 2 }]}>
																	{prediction.destNm}
																</Text>
																<View style={styles.etaContainer}>
																	<Text style={[
																		styles.etaText,
																		prediction.isDly === "1" && styles.delayedText,
																		isDue && styles.dueText,
																		prediction.isSch === "1" && styles.scheduledText
																	]}>
																		{isDue ? "DUE" : `${timeDiff} min`}
																	</Text>
																</View>
															</View>
														);
													})}
												</View>
											))
										) : (
											<Text style={styles.noPredictions}>
												No predictions available for this stop.
											</Text>
										)}
									</View>
								);
							})}
						</View>
					)}
				</View>
			</View>
		</TouchableOpacity>
	);

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
			<View style={styles.container}>
				{isLoadingStations ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color="#007AFF" />
						<Text style={styles.loadingText}>Loading Stations...</Text>
					</View>
				) : (
					<>
						<View style={styles.header}>
							<Text style={styles.title}>Chicago Train Stations</Text>
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
								placeholder="Search by Station Name"
								value={search}
								onChangeText={handleSearch}
								clearButtonMode="always"
								autoComplete=""
							/>
						</View>

						{search.length > 0 &&
						lines.flatMap(line => filterStations(line)).length < 1 ? (
							<Text style={styles.noMatch}>No Matching Stations</Text>
						) : (
							<SectionList
								sections={
									search.length > 0
										? [
												{
													data: lines
														.flatMap(line => filterStations(line))
														.sort((a, b) => a.map_id - b.map_id),
													key: "searchResults"
												}
										  ]
										: lines.map(line => ({
												title: line.label,
												data: line.dropdownOn ? filterStations(line) : [],
												color: line.color,
												stops: line.stations.length,
												key: line.label,
												directions: line.directions
										  }))
								}
								keyExtractor={(item, index) => `${item.map_id}-${item.line_label}-${index}`}
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
	stationTitleContainer: {
		flexDirection: "row",
		justifyContent: 'space-between',
		alignItems: "center",
		width: '100%'
	},
	stationNameContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		gap: 8
	},
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
	lineTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333"
	},
	stationCard: {
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
	stationColorIndicator: {
		width: 6,
	},
	stationInfo: {
		flex: 1,
		padding: 12,
	},
	stationHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 2,
	},
	stationMainContent: {
		flex: 1,
		paddingRight: 8,
		gap: 2,
	},
	stationName: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#333333',
		flexShrink: 1,
	},
	stationSubText: {
		fontSize: 14,
		color: '#666666',
		flexShrink: 1,
	},
	connectionContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 2,
	},
	connectionIcon: {
		marginRight: 4,
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
	stopPredictionsContainer: {
		borderBottomWidth: 1,
		borderBottomColor: '#EEEEEE',
		marginBottom: 8,
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
	tableRow: {
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
	etaText: {
		fontSize: 15,
		fontWeight: 'bold',
		color: '#666666',
		textAlign: 'right'
	},
	delayedText: {
		color: '#FF3B30',
	},
	dueText: {
		color: '#34C759',
	},
	scheduledText: {
		fontWeight: 'normal',
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

export default Trains;
