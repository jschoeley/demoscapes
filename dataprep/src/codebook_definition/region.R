# Construct YAML file with region definitions

# Init --------------------------------------------------------------------

library(yaml)
library(ISOcodes)

# Init --------------------------------------------------------------------

# input and output paths
setwd(".")
paths <- list()
paths$input <- list(
  region_patch.yaml = "./src/codebook_definition/region_patch.yaml"
)
paths$output <- list(
  region.yaml = "./out/codebook_definition/region.yaml"
)


# Define list elements ----------------------------------------------------

CreateEntry <- function(key, parentKey, name) {
  entry <- list(
    key = key,
    parentKey = parentKey,
    name = name
  )
  # ensure strings are quoted in yaml export
  for (i in 1:length(entry)) {
    attr(entry[[i]], "quoted") <- TRUE
  }
  return(entry)
}

# Define regions based on ISO codes with subdivisions ---------------------

# iso level 1, countries
iso_level1 <- vector("list", nrow(ISO_3166_1))
for (i in 1:nrow(ISO_3166_1)) {
  iso_level1[[i]] <- CreateEntry(
    key = ISO_3166_1[i, "Alpha_2"],
    parentKey = "none",
    name = ISO_3166_1[i, "Name"]
  )
}

# iso level 2, regions
iso_level2 <- vector("list", nrow(ISO_3166_2))
for (i in 1:nrow(ISO_3166_2)) {
  iso_level2[[i]] <- CreateEntry(
    key = ISO_3166_2[i, "Code"],
    parentKey = ifelse(is.na(ISO_3166_2[i, "Parent"]),
      substr(ISO_3166_2[i, "Code"], 1, 2),
      ISO_3166_2[i, "Parent"]
    ),
    name = ISO_3166_2[i, "Name"]
  )
}

# Apply manual patches ----------------------------------------------------

extra_regions <- list(
  CreateEntry(
    key = "GB-EAW",
    parentKey = "GB",
    name = "England and Wales"
  ),
  CreateEntry(
    key = "DE-W",
    parentKey = "DE",
    name = "Germany (West)"
  ),
  CreateEntry(
    key = "DE-E",
    parentKey = "DE",
    name = "Germany (East)"
  )
)

# Merge -------------------------------------------------------------------

region <- c(
  iso_level1,
  iso_level2,
  extra_regions
)

# order by key
order_key_pos <-
  lapply(
    region, function(x) x["key"]
  ) |>
  unlist() |>
  order()
region <- region[order_key_pos]

# Export ------------------------------------------------------------------

as.yaml(region)
write_yaml(region, file = paths$output$region.yaml)
