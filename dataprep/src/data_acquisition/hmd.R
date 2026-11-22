# Acquire data from the Human Mortality Database (HMD)
#
# Period death counts and death rates by country, subpopulation, year, and
# age from https://www.mortality.org. Requires HMD credentials in
# cfg/secrets.yml (hmd: user, password). The countries to download, their ISO
# codes, and subpopulations are listed under Constants.

# Init --------------------------------------------------------------------

here::i_am('src/data_acquisition/hmd.R'); setwd(here::here())

library(yaml)
library(qs2)
library(HMDHFDplus)

# Constants ---------------------------------------------------------------

# constants specific to this analysis
cnst <- within(list(), {
  source_key = 'hmd'
})

# input and output paths
paths <- list()
paths$input <- list(
  secrets.yml = 'cfg/secrets.yml'
)
paths$output <- list(
  source_dir = file.path('dat', cnst$source_key),
  deaths_period_by_age.qs = file.path('dat', cnst$source_key, 'deaths_period_by_age.qs'),
  deathrates_period_by_age.qs = file.path('dat', cnst$source_key, 'deathrates_period_by_age.qs')
)

dir.create(paths$output$source_dir, showWarnings = FALSE, recursive = TRUE)

secrets <- read_yaml(paths$input$secrets.yml)

# HMD countries to download, with the region code used by demoscapes and the
# subpopulation
hmd_codes <- read.csv(text = '
name,hmdcode,isocode,subpopulation
Australia,AUS,AU,Total Population
Austria,AUT,AT,Total Population
Belarus,BLR,BY,Total Population
Belgium,BEL,BE,Total Population
Bulgaria,BGR,BG,Total Population
Canada,CAN,CA,Total Population
Chile,CHL,CL,Total Population
Croatia,HRV,HR,Total Population
Czechia,CZE,CZ,Total Population
Denmark,DNK,DK,Total Population
Estonia,EST,EE,Total Population
Finland,FIN,FI,Total Population
France,FRATNP,FR,Total Population
Germany,DEUTNP,DE,Total Population
Greece,GRC,GR,Total Population
Hong Kong,HKG,HK,Total Population
Hungary,HUN,HU,Total Population
Iceland,ISL,IS,Total Population
Ireland,IRL,IE,Total Population
Israel,ISR,IL,Total Population
Italy,ITA,IT,Total Population
Japan,JPN,JP,Total Population
Latvia,LVA,LV,Total Population
Lithuania,LTU,LT,Total Population
Luxembourg,LUX,LU,Total Population
Netherlands,NLD,NL,Total Population
New Zealand,NZL_NP,NZ,Total Population
Norway,NOR,NO,Total Population
Poland,POL,PL,Total Population
Portugal,PRT,PT,Total Population
Republic of Korea,KOR,KR,Total Population
Russia,RUS,RU,Total Population
Slovakia,SVK,SK,Total Population
Slovenia,SVN,SI,Total Population
Spain,ESP,ES,Total Population
Sweden,SWE,SE,Total Population
Switzerland,CHE,CH,Total Population
Taiwan,TWN,TW,Total Population
U.K.,GBR_NP,GB,Total Population
U.S.A.,USA,US,Total Population
Ukraine,UKR,UA,Total Population
England and Wales (Total Population),GBRTENW,GB-EAW,Total Population
England and Wales (Civilian Population),GBRCENW,GB-EAW,Civilian Population
Scotland,GBR_SCO,GB-SCT,Total Population
Northern Ireland,GBR_NIR,GB-NIR,Total Population
New Zealand Maori,NZL_MA,NZ,Maori Population
New Zealand Non-Maori,NZL_NM,NZ,Non-Maori Population
East Germany,DEUTE,DE-E,Total Population
West Germany,DEUTW,DE-W,Total Population
')

# The list was originally created with
# data.frame(
#   name = getHMDcountries()[['Country']],
#   hmdcode = getHMDcountries()[['CNTRY']],
#   isocode = countrycode::countryname(getHMDcountries()[['Country']],
#     destination = 'iso2c'
#   )
# ) |>
#   write.csv()
# and edited by hand to add subpopulations and subnational regions. isocode
# holds ISO 3166-1 alpha-2 or ISO 3166-2 codes, matching the region codebook.

# Functions ---------------------------------------------------------------

# Download an HMD item for all countries in hmd_codes. Returns a list with one
# data frame per country.
DownloadHMDItem <- function (item) {
  lapply(hmd_codes$hmdcode, function (x) {
    cat(item, x, '\n')
    X <- readHMDweb(
      CNTRY = x, item = item,
      username = secrets$hmd$user,
      password = secrets$hmd$password
    )
    data.frame(
      X,
      hmdcode = x,
      isocode = hmd_codes$isocode[hmd_codes$hmdcode == x],
      subpopulation = hmd_codes$subpopulation[hmd_codes$hmdcode == x]
    )
  })
}

# Download ----------------------------------------------------------------

deaths_period_by_age <- DownloadHMDItem('Deaths_1x1')
deathrates_period_by_age <- DownloadHMDItem('Mx_1x1')

# Export ------------------------------------------------------------------

qs_save(deaths_period_by_age, paths$output$deaths_period_by_age.qs)
qs_save(deathrates_period_by_age, paths$output$deathrates_period_by_age.qs)
