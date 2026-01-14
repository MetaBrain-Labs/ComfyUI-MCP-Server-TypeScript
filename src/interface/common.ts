export interface AlertsResponse {
  features: AlertFeature[];
}

export interface AlertFeature {
  properties: {
    event?: string;
    areaDesc?: string;
    severity?: string;
    status?: string;
    headline?: string;
  };
}

export interface ForecastResponse {
  properties: {
    periods: ForecastPeriod[];
  };
}

export interface ForecastPeriod {
  name?: string;
  temperature?: number;
  temperatureUnit?: string;
  windSpeed?: string;
  windDirection?: string;
  shortForecast?: string;
}

export interface PointsResponse {
  properties: {
    forecast?: string;
  };
}
