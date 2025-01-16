import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Modal,
    Switch,
    Button,
    ActivityIndicator,
    SectionList,
} from "react-native";
import axios from "axios";

function Trains() {
    const [stations, setStations] = useState({});
    const [filteredStations, setFilteredStations] = useState({});
    const [search, setSearch] = useState("");
    const [dropdownStates, setDropdownStates] = useState({});
    const [suggestions, setSuggestions] = useState([]);
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({
        //Add filters here as we need
        red: true,
        blue: true,
        g: true,
        brn: true,
        p: true,
        pexp: true,
        pnk: true,
        y: true,
        o: true,
        
    });
    const [isFiltered, setIsFiltered] = useState(false);

    const addUniqueStation = (lineArray, station) => {
        // Check if station already exists in this line's array
        if (!lineArray.some(existingStation => existingStation.stop_id === station.stop_id)) {
            lineArray.push(station);
        }
    };

    const groupStationsByLine = (stations) => {
        return stations.reduce((acc, station) => {
        
            if (station.red) { 
                acc.Red = acc.Red || []; 
                addUniqueStation(acc.Red, station);
            }
            if (station.blue) { 
                acc.Blue = acc.Blue || []; 
                addUniqueStation(acc.Blue, station);
            }
            if (station.g) { 
                acc.Green = acc.Green || []; 
                addUniqueStation(acc.Green, station);
            }
            if (station.brn) { 
                acc.Brown = acc.Brown || []; 
                addUniqueStation(acc.Brown, station);
            }
            if (station.p) { 
                acc.Purple = acc.Purple || []; 
                addUniqueStation(acc.Purple, station);
            }
            if (station.pexp) { 
                acc["Purple (Express)"] = acc["Purple (Express)"] || []; 
                addUniqueStation(acc["Purple (Express)"], station);
            }
            if (station.pnk) { 
                acc.Pink = acc.Pink || []; 
                addUniqueStation(acc.Pink, station);
            }
            if (station.y) { 
                acc.Yellow = acc.Yellow || []; 
                addUniqueStation(acc.Yellow, station);
            }
            if (station.o) { 
                acc.Orange = acc.Orange || []; 
                addUniqueStation(acc.Orange, station);
            }
            return acc;
        }, {});
    };

    useEffect(() => {
        const fetchStations = async () => {
            try {
                const response = await axios.get(
                    "https://data.cityofchicago.org/resource/8pix-ypme.json"
                );
                
                const groupedStations = groupStationsByLine(response.data);
                setStations(groupedStations);
                setFilteredStations(groupedStations);
                setDropdownStates(
                    Object.keys(groupedStations).reduce((acc, line) => {
                        acc[line] = true;
                        return acc;
                    }, {})
                );
                // Organize stations by line color
                // const groupedByLines = response.data.reduce((acc, station) => {
                //     const lines = [];

                    // if (station.red === true) lines.push("Red");
                    // if (station.blue === true) lines.push("Blue");
                    // if (station.g === true) lines.push("Green");
                    // if (station.brn === true) lines.push("Brown");
                    // if (station.pexp === true) lines.push("Purple (Express)");
                    // if (station.p === true) lines.push("Purple");
                    // if (station.pnk === true) lines.push("Pink");
                    // if (station.y === true) lines.push("Yellow");
                    // if (station.o === true) lines.push("Orange");

                    // lines.forEach((line) => {
                    //     if (!acc[line]) acc[line] = [];
                    //     acc[line].push(station);
                    // });

                    // return acc;
                
            } catch (error) {
                console.error("Error fetching train station data:", error);
            } finally{
                setIsLoading(false);
            }
        };

        fetchStations();
    }, []);

    

    

    const handleSearch = (text) => {
        setSearch(text);

        const currentStations = isFiltered ? filteredStations : stations;

        // Generate suggestions for autofill
        const allStops = Object.values(currentStations).flat();
        const matchedSuggestions = allStops
            .filter((stop) =>
                stop.station_name.toLowerCase().includes(text.toLowerCase())
            )
            .map((stop) => stop.station_name);
        setSuggestions([...new Set(matchedSuggestions)]);

        // Filter stations by search query
        const filtered = Object.entries(currentStations).reduce((acc, [line, stops]) => {
            const filteredStops = stops.filter((stop) =>
                stop.station_name.toLowerCase().includes(text.toLowerCase())
            );
            if (filteredStops.length > 0) acc[line] = filteredStops;
            return acc;
        }, {});

        setFilteredStations(filtered);
    };

    const handleSuggestionClick = (suggestion) => {
        setSearch(suggestion);
        handleSearch(suggestion);
        setSuggestions([]);
    };

    const toggleDropdown = (line) => {
        setDropdownStates((prevState) => ({
            ...prevState,
            [line]: !prevState[line],
        }));
    };

    const toggleFilterModal = () => {
        setIsFilterModalVisible(!isFilterModalVisible);
    };

    const clearFilters = () => {
        setFilters({
            red: true,
            blue: true,
            g: true,
            brn: true,
            pexp: true,
            p: true,
            pnk: true,
            y: true,
            o: true,
        });
        setFilteredStations(stations);
        setIsFiltered(false);
    };
    const applyFilters = () => {
        
        // const filtered = stations.filter((station) => {
        //   //Example filter logic.  Adjust to your needs.
        //     const activeFilters = Object.entries(filters)
        //         .filter(([_, isEnabled]) => isEnabled)
        //         .map(([filterKey]) => filterKey);
            
        //     // Check if station has all required lines
        //     return activeFilters.every(filterKey => station[filterKey]);
        // });
        // setFilteredStations(filtered);
        // toggleFilterModal();
        // setIsFiltered(true);
        const allStations = Object.values(stations).flat();
        const filteredStations = allStations.filter(station => 
            Object.entries(filters)
                .filter(([_, isEnabled]) => isEnabled)
                .some(([key]) => station[key])
        );

        const regrouped = groupStationsByLine(filteredStations, filters);
        
        setFilteredStations(regrouped);
        toggleFilterModal();
        setIsFiltered(true);
    };
    return (
        <View style={styles.container}>
            {isLoading ? (
                <View style={styles.loadingContainer}>
                <ActivityIndicator/>
                <Text style={styles.loadingText}>Loading Stations...</Text>
                </View>
            ) : (
            <>
            <TouchableOpacity style={styles.filterButton} onPress={toggleFilterModal}>
                <Text style={styles.filterButtonText}>Filter</Text>
            </TouchableOpacity>
            
            <TextInput
                style={styles.searchBar}
                placeholder="Search by Station Name"
                value={search}
                onChangeText={handleSearch}
            />
            
            {/* Filter Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isFilterModalVisible}
                onRequestClose={toggleFilterModal}
            >
                <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    
                    <Text style={styles.modalTitle}>Filter Stations</Text>
                    <Text>Red Line</Text>
                    <Switch
                    value={filters.red}
                    onValueChange={(value) => setFilters({...filters, red: value})}
                    />
                    <Text>Blue Line</Text>
                    <Switch
                    value={filters.blue}
                    onValueChange={(value) => setFilters({...filters, blue: value})}
                    />
                    <Text>Green Line</Text>
                    <Switch
                    value={filters.g}
                    onValueChange={(value) => setFilters({...filters, g: value})}
                    />
                    
                    <Text>Brown Line</Text>
                    <Switch
                    value={filters.brn}
                    onValueChange={(value) => setFilters({...filters, brn: value})}
                    />
                    <Text>Purple Express Line</Text>
                    <Switch
                    value={filters.pexp}
                    onValueChange={(value) => setFilters({...filters, pexp: value})}
                    />
                    <Text>Purple Line</Text>
                    <Switch
                    value={filters.p}
                    onValueChange={(value) => setFilters({...filters, p: value})}
                    />
                    <Text>Pink Line</Text>
                    <Switch
                    value={filters.pnk}
                    onValueChange={(value) => setFilters({...filters, pnk: value})}
                    />
                    <Text>Yellow Line</Text>
                    <Switch
                    value={filters.y}
                    onValueChange={(value) => setFilters({...filters, y: value})}
                    />
                    <Text>Orange Line</Text>
                    <Switch
                    value={filters.o}
                    onValueChange={(value) => setFilters({...filters, o: value})}
                    />
                    <Button title="Apply Filters" onPress={applyFilters} />
                    <Button title="Cancel" onPress={toggleFilterModal} />
                </View>
                </View>
            </Modal>
            {suggestions.length > 0 && (
                <ScrollView style={styles.suggestionsContainer}>
                    {suggestions.map((suggestion, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={() => handleSuggestionClick(suggestion)}
                        >
                            <Text style={styles.suggestionText}>{suggestion}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
            <SectionList
                sections={Object.entries(filteredStations).map(([line, stops]) => ({
                    title: line,
                    data: dropdownStates[line] ? stops : [], 
                    stops: stops.length 
                }))}
                renderItem={({ item, section }) => (
                    <View style={styles.stopCard}>
                        <Text style={styles.stopName}>{item.station_name}</Text>
                        <Text style={styles.stopId}>Stop ID: {item.stop_id}</Text>
                    </View>
                )}
                renderSectionHeader={({ section }) => (
                    <TouchableOpacity 
                        onPress={() => toggleDropdown(section.title)}
                        style={styles.sectionHeader}
                    >
                        <Text style={[styles.lineTitle, { color: section.title.toLowerCase() }]}>
                            {section.title} Line ({section.stops} stops)
                        </Text>
                    </TouchableOpacity>
                )}
                stickySectionHeadersEnabled={true}
                keyExtractor={(item, index) => `${item.stop_id}-${index}`}
            />
            
            {isFiltered && (
                <TouchableOpacity 
                    style={styles.clearFiltersButton}
                    onPress={clearFilters}
                >
                    <Text style={styles.clearFiltersText}>Clear Filters</Text>
                </TouchableOpacity>
            )}
            </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: "#f4f4f4",
    },
    searchBar: {
        height: 40,
        borderColor: "#ccc",
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 16,
    },
    suggestionsContainer: {
        backgroundColor: "#fff",
        borderRadius: 8,
        marginBottom: 16,
        maxHeight: 150,
    },
    suggestionText: {
        padding: 10,
        fontSize: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    lineSection: {
        marginBottom: 16,
        backgroundColor: "#fff",
        borderRadius: 8,
        padding: 8,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
    },
    lineTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 8,
    },
    stopCard: {
        marginVertical: 4,
        padding: 8,
        backgroundColor: "#f9f9f9",
        borderRadius: 6,
        marginHorizontal: 8,
    },
    stopName: {
        fontSize: 16,
        fontWeight: "bold",
    },
    stopId: {
        fontSize: 14,
        color: "#666",
    },
    clearFiltersButton: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
        backgroundColor: '#ff4444',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    clearFiltersText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    filterButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 8,
        marginBottom: 16,
    },
    filterButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        width: '80%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    sectionHeader: {
        backgroundColor: '#fff',
        padding: 8,
        borderRadius: 8,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
    },
});

export default Trains;
